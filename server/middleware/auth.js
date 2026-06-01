const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'toyota_dms_secret_compliance_key_2026';


const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authorization token is missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Toyota DMS Backend: JWT Verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid or expired authorization token.' });
  }
};


const verifyRole = (allowedRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== allowedRole) {
      return res.status(403).json({ message: `Access denied. Requires role: ${allowedRole}` });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  verifyRole
};
