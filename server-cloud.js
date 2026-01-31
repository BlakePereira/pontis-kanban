const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const database = require('./database');
const { requireAuth, authenticatePassword } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'pontis-kanban-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Serve static files with no-cache headers for development
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Authentication Routes

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }
  
  if (authenticatePassword(password)) {
    req.session.authenticated = true;
    res.json({ message: 'Authentication successful' });
  } else {
    res.status(401).json({ message: 'Invalid access code' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Protected API Routes

// Get all tasks
app.get('/api/tasks', requireAuth, (req, res) => {
  database.getAllTasks((err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create new task
app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, description, priority, assignee, status } = req.body;
  
  // Basic validation
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
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      id: result.lastID,
      ...taskData,
      message: 'Task created successfully'
    });
  });
});

// Update task
app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const taskId = req.params.id;
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
  
  database.updateTask(taskId, taskData, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Task updated successfully', changes: result.changes });
  });
});

// Update task status (for drag and drop)
app.patch('/api/tasks/:id/status', requireAuth, (req, res) => {
  const taskId = req.params.id;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  database.updateTaskStatus(taskId, status, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Task status updated', changes: result.changes });
  });
});

// Delete task
app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const taskId = req.params.id;
  
  database.deleteTask(taskId, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Task deleted', changes: result.changes });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve the frontend
app.get('/', requireAuth, (req, res) => {
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
  console.log(`🌐 Ready for cloud deployment!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    database.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    database.close();
    process.exit(0);
  });
});

module.exports = app;