// JWT-based authentication for Pontis Kanban (serverless-safe)
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SESSION_SECRET || 'pontis-kanban-secret-2026';
const TOKEN_EXPIRY = '7d'; // 7 days

function generateToken() {
  return jwt.sign(
    { authenticated: true, loginTime: new Date().toISOString() },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  // Check for API key (for Clara's access)
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.API_KEY) {
    return next();
  }

  // Check for JWT in Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
      return next();
    }
  }

  // For API routes, return 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // For web routes, redirect to login
  res.redirect('/login');
}

function authenticatePassword(password) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'pontis2026';
  return password === adminPassword;
}

module.exports = {
  requireAuth,
  authenticatePassword,
  generateToken,
  verifyToken
};
