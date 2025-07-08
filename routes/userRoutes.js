const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { sendEmail } = require('../functions/emailService');

const {
  getUserByEmail,
  createUser,
  validatePassword,
  updateUserPassword,
  hashPassword
} = require('../database/user');

const authenticateToken = require('../functions/authTokens');


const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// In production, never fallback to weak secrets:
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.error('Missing JWT secrets in environment variables!');
  process.exit(1);
}

// Token expiration times
const ACCESS_TOKEN_EXP = '15m';
const REFRESH_TOKEN_EXP = '7d';

// Helper to generate access token
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXP }
  );
}

// Helper to generate refresh token
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXP }
  );
}

// Instead of in-memory array, store refresh tokens in httpOnly cookies (safer)

// Refresh token endpoint
router.post('/refresh-token', (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token missing' });
  }

  jwt.verify(refreshToken, REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid refresh token' });

    const accessToken = generateAccessToken(user);
    res.json({ success: true, accessToken });
  });
});

// Register
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    await createUser(firstName, lastName, email, password, role);
    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await getUserByEmail(email);
    if (!user) return res.status(400).json({ success: false, message: 'User not found' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ success: false, message: 'Invalid password' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

 res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: false,      // localhost: no https, so false
  sameSite: 'lax',    // instead of 'strict', allows some cross-site requests (like top-level navigations and POSTs)
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',          // optional but good practice
});


    res.json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      userId: user.id
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PROFILE (protected)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { first_name, last_name, email } = user;
    res.json({ success: true, first_name, last_name, email });

  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
router.post('/reset-password-request', async (req, res) => {
  const { email } = req.body;

  // Basic email format validation
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid email address.',
    });
  }

  try {
    // Try to fetch the user by email
    const user = await getUserByEmail(email);

    // For security reasons, always respond with the same message
    // to prevent attackers from guessing existing accounts
    const genericResponse = {
      success: true,
      message:
        'If an account is associated with this email, a password reset link has been sent.',
    };

    if (!user) {
      return res.json(genericResponse);
    }

    // Generate a JWT token for password reset
    const resetToken = jwt.sign({ email: user.email }, ACCESS_SECRET, {
      expiresIn: '15m',
    });

    // Construct the reset URL
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    // Compose the email message
    const message = `
Hi ${user.name || 'there'},

We received a request to reset your password. Click the link below to choose a new one:

🔗 ${resetLink}

This link is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email.

Best regards,  
ZeroCheating Classroom Support Team
    `.trim();

    // Send the email
    await sendEmail(email, 'Reset Your Password - ZeroCheating', message);

    // Respond with the generic message
    res.json(genericResponse);
  } catch (error) {
    console.error('Error generating reset token or sending email:', error);

    res.status(500).json({
      success: false,
      message: 'Something went wrong while processing your request. Please try again later.',
    });
  }
});

// RESET PASSWORD USING TOKEN
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Token and new password are required' });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    const email = decoded.email;

    const newHashed = await hashPassword(newPassword);
    await updateUserPassword(email, newHashed);

    res.json({ success: true, message: 'Password successfully reset.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ success: false, message: 'Invalid or expired token.' });
  }
});

// CHANGE PASSWORD (authenticated)
router.post('/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both old and new passwords are required.' });
  }

  try {
    const user = await getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const validPassword = await validatePassword(oldPassword, user.password);
    if (!validPassword) return res.status(400).json({ success: false, message: 'Incorrect old password.' });

    const newHashedPassword = await hashPassword(newPassword);
    await updateUserPassword(user.email, newHashedPassword);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// LOGOUT - clears the refresh token cookie
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
