const express = require('express');
const cors = require('cors');
const path = require('path');
const database = require('./database');
const { requireAuth, authenticatePassword, generateToken, verifyToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// ===== Authentication Routes =====

// Login endpoint — returns JWT
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  if (authenticatePassword(password)) {
    const token = generateToken();
    res.json({
      message: 'Authentication successful',
      token,
      redirect: '/'
    });
  } else {
    res.status(401).json({ message: 'Invalid access code' });
  }
});

// Session status — validates JWT
app.get('/api/auth/status', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload) {
      return res.json({
        authenticated: true,
        loginTime: payload.loginTime
      });
    }
  }
  res.status(401).json({ authenticated: false });
});

// Logout (client-side only — just clears localStorage)
app.post('/api/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Login page (served as static HTML, no auth needed)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ===== Protected API Routes =====

// Get all tasks
app.get('/api/tasks', requireAuth, (req, res) => {
  database.getAllTasks((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create new task
app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, description, priority, assignee, status } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const taskData = {
    title: title.trim(),
    description: description ? description.trim() : '',
    priority: priority || 'medium',
    assignee: assignee || '',
    status: status || 'backlog'
  };

  database.createTask(taskData, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.lastID, ...taskData, message: 'Task created successfully' });
  });
});

// Update task
app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const { title, description, priority, assignee, status } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const taskData = {
    title: title.trim(),
    description: description ? description.trim() : '',
    priority: priority || 'medium',
    assignee: assignee || '',
    status: status || 'backlog'
  };

  database.updateTask(req.params.id, taskData, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Task updated successfully', changes: result.changes });
  });
});

// Update task status (drag & drop)
app.patch('/api/tasks/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  database.updateTaskStatus(req.params.id, status, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Task status updated', changes: result.changes });
  });
});

// Delete task
app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  database.deleteTask(req.params.id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Task deleted', changes: result.changes });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve the frontend (check JWT from query param or redirect to login)
app.get('/', (req, res) => {
  // The frontend handles auth check via JS — just serve the page
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Pontis Kanban Board running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Auth: JWT-based (serverless-safe)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => { database.close(); process.exit(0); });
});
process.on('SIGINT', () => {
  server.close(() => { database.close(); process.exit(0); });
});

module.exports = app;
