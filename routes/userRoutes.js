const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { getUserByEmail, validatePassword, createUser } = require('../database/user'); // Import necessary functions

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

    // Send user details (including first and last name) in the response
    return res.json({
      success: true,
      message: 'Login successful',
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
