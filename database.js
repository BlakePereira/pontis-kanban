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
      
      console.log('Seeding database with current Pontis tasks...');
      
      const realTasks = [
        // ===== BACKLOG =====
        {
          title: 'BUG-001: QR Code Goes Directly to Memorial Page',
          description: 'Critical QR routing issue - race condition in Memorial.tsx. QR should route through claim flow, not directly to memorial.',
          priority: 'critical',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'BUG-002: Address Data Not Parsing Correctly',
          description: 'Full address stored in street field only, breaks commissions and service areas. Need proper address component parsing.',
          priority: 'critical',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'BUG-003: Orders Not Showing in Partner Portal',
          description: 'Care subscription orders not appearing in partner portal dashboard. Partners cant see revenue.',
          priority: 'critical',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'Setup Clara Staging Environment',
          description: 'Separate Supabase project for safe dev access. Clara needs staging credentials to help with development without touching production.',
          priority: 'critical',
          assignee: 'Clara',
          status: 'backlog'
        },
        {
          title: 'Per-Fulfillment-Partner Pricing',
          description: 'Each service provider sets their own rates instead of global pricing. Critical for multi-market expansion.',
          priority: 'high',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'Subscription Flow UX Improvements',
          description: 'Improve value proposition messaging and skip button placement. 75% of customers are elderly - needs to be dead simple.',
          priority: 'high',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'Email Deliverability Setup',
          description: 'SPF, DKIM, DMARC for pontis.life domain. Need email warm-up before sending to customers. Critical for onboarding flow.',
          priority: 'high',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'Elderly-Friendly Onboarding Flow',
          description: '75% of monument shop customers cant do tech setup. Need phone-assisted or ultra-simple claim flow. Biggest adoption risk.',
          priority: 'high',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'GPS Offline Fallback for Cemetery Scans',
          description: 'Cemetery cell coverage is often poor. Need offline-capable QR scan + GPS workflow or manual fallback.',
          priority: 'medium',
          assignee: 'Blake',
          status: 'backlog'
        },
        {
          title: 'Subscription Bundling (Flower + Cleaning)',
          description: 'Families should be able to subscribe to flower delivery + headstone cleaning as a combo package at a discount.',
          priority: 'medium',
          assignee: 'Blake',
          status: 'backlog'
        },

        // ===== IN PROGRESS =====
        {
          title: 'QA Testing - Full Platform Walkthrough',
          description: 'Working through all user flows: memorial creation, QR scanning, subscriptions, partner portal, admin. 108 test cases.',
          priority: 'high',
          assignee: 'Joe',
          status: 'progress'
        },
        {
          title: 'Fix Remaining Critical Bugs from QA',
          description: 'Address bugs found in Joe QA testing sessions. Working through critical and major issues.',
          priority: 'critical',
          assignee: 'Blake',
          status: 'progress'
        },
        {
          title: 'Prospect Database Build (500+ Companies)',
          description: '37/500 monument companies researched. Enriched contact info, tech scores, geographic coverage across 6 US regions. Due Feb 2.',
          priority: 'high',
          assignee: 'Clara',
          status: 'progress'
        },
        {
          title: 'Weekly Grant Intelligence Report',
          description: 'Recurring weekly research - grants Pontis qualifies for (tech, preservation, veterans, small biz, Utah). Report #1 complete.',
          priority: 'high',
          assignee: 'Clara',
          status: 'progress'
        },

        // ===== TESTING =====
        {
          title: 'Verify 8 Critical Bug Fixes (Session 1)',
          description: 'QR routing, email validation, portal auth, partner signup - 8 critical bugs fixed, need final QA verification.',
          priority: 'high',
          assignee: 'Joe',
          status: 'testing'
        },

        // ===== DONE =====
        {
          title: 'Fixed 8 Critical Bugs (QA Session 1)',
          description: 'QR routing, email validation, portal auth, and 5 other critical issues resolved.',
          priority: 'critical',
          assignee: 'Blake',
          status: 'done'
        },
        {
          title: 'Comprehensive QA Test Plan (108 Cases)',
          description: 'Full test plan covering all user flows, edge cases, and regression tests for the entire platform.',
          priority: 'high',
          assignee: 'Clara',
          status: 'done'
        },
        {
          title: 'Blake Brain System',
          description: 'Personal growth tracking with weekly reports, scripture study tracker, and goal scorecards.',
          priority: 'medium',
          assignee: 'Clara',
          status: 'done'
        },
        {
          title: 'Cloud Kanban Board',
          description: 'Deployed project management board on Vercel with JWT auth, drag-drop, team filters.',
          priority: 'high',
          assignee: 'Clara',
          status: 'done'
        },
        {
          title: 'Codebase Analysis (1,226 Files)',
          description: 'Full technical architecture review: 26 DB tables, 25 edge functions, 134 migrations, 4 user portals.',
          priority: 'high',
          assignee: 'Clara',
          status: 'done'
        },
        {
          title: 'Competitive Landscape Research',
          description: 'Analysis of competitors in QR memorial space, pricing, features, market positioning.',
          priority: 'medium',
          assignee: 'Clara',
          status: 'done'
        },
        {
          title: 'Partner Success Framework',
          description: 'Comprehensive system for tracking monument company partner health, onboarding, QBRs.',
          priority: 'medium',
          assignee: 'Clara',
          status: 'done'
        },
        {
          title: 'Grant Report #1 Delivered',
          description: 'First weekly grant intelligence report - identified multiple relevant grants with deadlines and eligibility.',
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
      function(err) {
        callback(err, this);
      }
    );
  }

  updateTaskStatus(taskId, status, callback) {
    this.db.run(
      "UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, taskId],
      function(err) {
        callback(err, this);
      }
    );
  }

  deleteTask(taskId, callback) {
    this.db.run("DELETE FROM tasks WHERE id = ?", [taskId], function(err) {
      callback(err, this);
    });
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