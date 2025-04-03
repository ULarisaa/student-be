const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getUserByEmail, createUser } = require('../database/user'); // Import necessary functions

// Your secret key for signing the JWT
const JWT_SECRET = 'Secret'; // You can make this more secure and store it in an environment variable

// POST /register: Handles user registration
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  // Validate input
  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ error: 'Please provide first name, last name, email, password, and role' });
  }

  try {
    // Create the user in the database
    await createUser(firstName, lastName, email, password, role);

    // Send a success response
    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /login: Handles user login and generates JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Invalid password' });
    }

    // Create a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, // Payload
      JWT_SECRET, // Secret key
      { expiresIn: '1h' } // Token expiration time
    );

    // Send the token in the response
    return res.json({
      success: true,
      message: 'Login successful',
      token, // Include the token
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      userId: user.id,
    });

  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
