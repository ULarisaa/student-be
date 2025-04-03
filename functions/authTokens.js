const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'Secret'; // Load the secret key

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  console.log('Token received:', token);

  if (!token || !req.headers['authorization'].startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Token is required and must be in Bearer format' });
  }

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Invalid token:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user; // Attach user data to the request object
    next();
  });
}

module.exports = authenticateToken;
