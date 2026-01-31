// Simple authentication middleware for Pontis Kanban

function requireAuth(req, res, next) {
  // Check for API key (for Clara's access)
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.API_KEY) {
    return next();
  }
  
  // Check for web session (for Blake's browser access)
  if (req.session && req.session.authenticated) {
    return next();
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
  authenticatePassword
};