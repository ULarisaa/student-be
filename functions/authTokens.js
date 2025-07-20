const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'Secret'; 

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  console.log('Token received:', token);

  if (!token || !authHeader?.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Token is required and must be in Bearer format' });
  }


  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token error:', err);

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }

      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user; 
    next();
  });
}

module.exports = authenticateToken;
