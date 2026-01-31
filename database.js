const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    // For cloud deployment, we'll use a persistent database file
    this.dbPath = process.env.NODE_ENV === 'production' 
      ? '/tmp/kanban.db'  // Vercel's temp directory
      : path.join(__dirname, 'kanban.db');
    
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database at:', this.dbPath);
        this.initializeDatabase();
      }
    });
  }

  initializeDatabase() {
    // Create tables if they don't exist
    this.db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT CHECK(priority IN ('critical', 'high', 'medium', 'low')),
      assignee TEXT,
      status TEXT CHECK(status IN ('backlog', 'progress', 'testing', 'done')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Tasks table ready');
        this.seedInitialData();
      }
    });
  }

  seedInitialData() {
    // Check if we already have data
    this.db.get("SELECT COUNT(*) as count FROM tasks", (err, row) => {
      if (err) {
        console.error('Error checking data:', err);
        return;
      }
      
      if (row.count > 0) {
        console.log(`Database already has ${row.count} tasks`);
        return;
      }
      
      console.log('Seeding database with Blake\'s real tasks...');
      
      // Import all the real tasks from Blake's project
      const realTasks = [
        {
          title: 'BUG-001: QR Code Goes Directly to Memorial Page',
          description: 'Critical QR routing issue - race condition in Memorial.tsx',
          priority: 'critical',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'BUG-002: Address Data Not Parsing Correctly',
          description: 'Full address stored in street field only, breaks commissions and service areas',
          priority: 'critical',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'BUG-003: Orders Not Showing in Partner Portal',
          description: 'Care subscription orders not appearing in partner portal',
          priority: 'critical',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'Setup Clara Staging Environment',
          description: 'Separate Supabase project for safe development access',
          priority: 'critical',
          assignee: 'Clara',
          status: 'backlog'
        },
        {
          title: 'Per-Fulfillment-Partner Pricing',
          description: 'Each service provider sets their own rates instead of global pricing',
          priority: 'high',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'Subscription Flow UX Improvements',
          description: 'Improve value proposition messaging and skip button placement',
          priority: 'high',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'QA Testing Session 2',
          description: 'Working through memorial flows and subscription testing',
          priority: 'high',
          assignee: 'Joe',
          status: 'progress'
        },
        {
          title: 'Fix Remaining Critical Bugs',
          description: 'Address bugs found in QA testing',
          priority: 'critical',
          assignee: 'Blake',
          status: 'progress'
        },
        {
          title: 'Verify Yesterday\'s Bug Fixes',
          description: '8 critical and major bugs fixed need final QA verification',
          priority: 'high',
          assignee: 'Joe',
          status: 'testing'
        },
        {
          title: 'Fixed 8 Critical Bugs (Session 1)',
          description: 'QR routing, email validation, portal auth - all resolved!',
          priority: 'critical',
          assignee: 'Blake',
          status: 'done'
        },
        {
          title: 'Comprehensive QA Test Plan',
          description: '108 test cases covering all user flows and edge cases',
          priority: 'high',
          assignee: 'Clara',
          status: 'done'
        },
        {
          title: 'Blake Brain System',
          description: 'Personal growth tracking with weekly reports and scripture study',
          priority: 'medium',
          assignee: 'Clara',
          status: 'done'
        },
        {
          title: 'Professional Kanban Board',
          description: 'Cloud-deployed task management system',
          priority: 'high',
          assignee: 'Clara',
          status: 'done'
        }
      ];
      
      const stmt = this.db.prepare(`INSERT INTO tasks (title, description, priority, assignee, status) VALUES (?, ?, ?, ?, ?)`);
      
      realTasks.forEach(task => {
        stmt.run(task.title, task.description, task.priority, task.assignee, task.status);
      });
      
      stmt.finalize();
      console.log(`Seeded ${realTasks.length} tasks successfully`);
    });
  }

  // Database methods
  getAllTasks(callback) {
    this.db.all("SELECT * FROM tasks ORDER BY created_at DESC", callback);
  }

  createTask(taskData, callback) {
    this.db.run(
      "INSERT INTO tasks (title, description, priority, assignee, status) VALUES (?, ?, ?, ?, ?)",
      [taskData.title, taskData.description, taskData.priority, taskData.assignee, taskData.status || 'backlog'],
      function(err) {
        callback(err, this);
      }
    );
  }

  updateTask(taskId, taskData, callback) {
    this.db.run(
      "UPDATE tasks SET title = ?, description = ?, priority = ?, assignee = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [taskData.title, taskData.description, taskData.priority, taskData.assignee, taskData.status, taskId],
      callback
    );
  }

  updateTaskStatus(taskId, status, callback) {
    this.db.run(
      "UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, taskId],
      callback
    );
  }

  deleteTask(taskId, callback) {
    this.db.run("DELETE FROM tasks WHERE id = ?", [taskId], callback);
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = new Database();