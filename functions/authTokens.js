const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // Get token from Authorization header (Bearer token format)

  // Check if the token is provided and in correct format
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Token is required and must be in Bearer format' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Invalid token:', err); // Log the error for debugging purposes
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Attach the user data to the request object
    req.user = user;
    next(); // Call the next middleware or route handler
  });
}

module.exports = authenticateToken;
