// Supabase-backed database for Pontis Kanban
// Replaces SQLite — data persists across serverless cold starts

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lgvvylbohcboyzahhono.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TABLE = 'kanban_tasks';

// Lightweight Supabase REST client (no SDK dependency needed)
async function query(method, path, body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

class Database {
  constructor() {
    console.log('🔌 Using Supabase database:', SUPABASE_URL);
    if (!SUPABASE_KEY) {
      console.warn('⚠️  SUPABASE_SERVICE_KEY not set! Database calls will fail.');
    }
    this.checkAndSeed();
  }

  async checkAndSeed() {
    try {
      const rows = await query('GET', `${TABLE}?select=id&limit=1`);
      if (rows.length === 0) {
        console.log('Database empty, seeding initial tasks...');
        await this.seedTasks();
      } else {
        console.log('Database has existing tasks, skipping seed.');
      }
    } catch (err) {
      console.error('DB check failed:', err.message);
    }
  }

  async seedTasks() {
    const tasks = [
      // BACKLOG
      { title: 'BUG-001: QR Code Goes Directly to Memorial Page', description: 'Critical QR routing issue - race condition in Memorial.tsx. QR should route through claim flow, not directly to memorial.', priority: 'critical', assignee: 'Blake', status: 'backlog' },
      { title: 'BUG-002: Address Data Not Parsing Correctly', description: 'Full address stored in street field only, breaks commissions and service areas.', priority: 'critical', assignee: 'Blake', status: 'backlog' },
      { title: 'BUG-003: Orders Not Showing in Partner Portal', description: 'Care subscription orders not appearing in partner portal dashboard.', priority: 'critical', assignee: 'Blake', status: 'backlog' },
      { title: 'Setup Clara Staging Environment', description: 'Separate Supabase project for safe dev access.', priority: 'critical', assignee: 'Clara', status: 'backlog' },
      { title: 'Per-Fulfillment-Partner Pricing', description: 'Each service provider sets their own rates instead of global pricing.', priority: 'high', assignee: 'Blake', status: 'backlog' },
      { title: 'Subscription Flow UX Improvements', description: 'Improve value proposition messaging and skip button placement. Elderly-friendly.', priority: 'high', assignee: 'Blake', status: 'backlog' },
      { title: 'Email Deliverability Setup', description: 'SPF, DKIM, DMARC for pontis.life domain. Need email warm-up.', priority: 'high', assignee: 'Blake', status: 'backlog' },
      { title: 'Elderly-Friendly Onboarding Flow', description: '75% of customers cant do tech setup. Need phone-assisted or ultra-simple claim flow.', priority: 'high', assignee: 'Blake', status: 'backlog' },
      { title: 'GPS Offline Fallback for Cemetery Scans', description: 'Cemetery cell coverage is often poor. Need offline-capable QR scan workflow.', priority: 'medium', assignee: 'Blake', status: 'backlog' },
      { title: 'Subscription Bundling (Flower + Cleaning)', description: 'Families should subscribe to flower + cleaning as a combo package.', priority: 'medium', assignee: 'Blake', status: 'backlog' },

      // IN PROGRESS
      { title: 'QA Testing - Full Platform Walkthrough', description: 'All user flows: memorial creation, QR scanning, subscriptions, partner portal. 108 test cases.', priority: 'high', assignee: 'Joe', status: 'progress' },
      { title: 'Fix Remaining Critical Bugs from QA', description: 'Address bugs found in Joe QA testing sessions.', priority: 'critical', assignee: 'Blake', status: 'progress' },
      { title: 'Prospect Database Build (500+ Companies)', description: '37/500 monument companies researched. Due Feb 2.', priority: 'high', assignee: 'Clara', status: 'progress' },
      { title: 'Weekly Grant Intelligence Report', description: 'Recurring weekly research - grants Pontis qualifies for. Report #1 complete.', priority: 'high', assignee: 'Clara', status: 'progress' },

      // TESTING
      { title: 'Verify 8 Critical Bug Fixes (Session 1)', description: 'QR routing, email validation, portal auth - need final QA verification.', priority: 'high', assignee: 'Joe', status: 'testing' },

      // DONE
      { title: 'Fixed 8 Critical Bugs (QA Session 1)', description: 'QR routing, email validation, portal auth resolved.', priority: 'critical', assignee: 'Blake', status: 'done' },
      { title: 'Comprehensive QA Test Plan (108 Cases)', description: 'Full test plan covering all user flows and edge cases.', priority: 'high', assignee: 'Clara', status: 'done' },
      { title: 'Blake Brain System', description: 'Personal growth tracking with weekly reports and scripture study.', priority: 'medium', assignee: 'Clara', status: 'done' },
      { title: 'Cloud Kanban Board', description: 'Deployed project management board with JWT auth, drag-drop, team filters.', priority: 'high', assignee: 'Clara', status: 'done' },
      { title: 'Codebase Analysis (1,226 Files)', description: 'Full technical architecture review of Pontis platform.', priority: 'high', assignee: 'Clara', status: 'done' },
      { title: 'Competitive Landscape Research', description: 'Analysis of competitors in QR memorial space.', priority: 'medium', assignee: 'Clara', status: 'done' },
      { title: 'Partner Success Framework', description: 'System for tracking monument company partner health and onboarding.', priority: 'medium', assignee: 'Clara', status: 'done' },
      { title: 'Grant Report #1 Delivered', description: 'First weekly grant intelligence report with relevant grants.', priority: 'high', assignee: 'Clara', status: 'done' }
    ];

    try {
      await query('POST', TABLE, tasks);
      console.log(`✅ Seeded ${tasks.length} tasks`);
    } catch (err) {
      console.error('Seed failed:', err.message);
    }
  }

  // ===== CRUD Methods (callback-style for compatibility with server-cloud.js) =====

  getAllTasks(callback) {
    query('GET', `${TABLE}?select=*&order=created_at.desc`)
      .then(rows => callback(null, rows))
      .catch(err => callback(err));
  }

  async createTask(taskData, callback) {
    // Validate required fields
    if (!taskData.priority) {
      return callback(new Error('Priority is required'));
    }
    
    try {
      // Generate task code
      const taskCode = await this.generateTaskCode(taskData.priority);
      console.log('Generated task code:', taskCode);
      
      const task = {
        title: taskData.title,
        description: taskData.description || '',
        priority: taskData.priority,
        assignee: taskData.assignee || '',
        status: taskData.status || 'backlog',
        board: taskData.board || 'pontis-dev',
        task_code: taskCode
      };

      const rows = await query('POST', TABLE, task);
      const created = rows[0];
      console.log('Created task:', created);
      console.log('Returning result with taskCode:', taskCode);
      callback(null, { lastID: created.id, changes: 1, taskCode: taskCode });
    } catch (err) {
      console.error('Error in createTask:', err);
      callback(err);
    }
  }

  async generateTaskCode(priority) {
    // Get priority prefix
    const prefixes = {
      'critical': 'C',
      'high': 'H', 
      'medium': 'M',
      'low': 'L'
    };
    
    const prefix = prefixes[priority.toLowerCase()] || 'M';
    
    // Get highest existing number for this priority
    try {
      // Try to get existing tasks, but handle schema issues gracefully
      let allTasks = [];
      try {
        allTasks = await query('GET', `${TABLE}?select=task_code`);
      } catch (schemaError) {
        // task_code field might not exist yet, fallback to getting all tasks
        console.log('task_code field might not exist, falling back...');
        allTasks = await query('GET', `${TABLE}?select=*&limit=1000`);
      }
      
      let maxNumber = 0;
      allTasks.forEach(task => {
        if (task.task_code && task.task_code.startsWith(`${prefix}-`)) {
          const match = task.task_code.match(/^[A-Z]-(\d+)$/);
          if (match) {
            maxNumber = Math.max(maxNumber, parseInt(match[1]));
          }
        }
      });
      
      const nextNumber = maxNumber + 1;
      return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating task code:', err);
      // Generate based on timestamp to ensure uniqueness
      const timestamp = Date.now().toString().slice(-3);
      return `${prefix}-${timestamp}`;
    }
  }

  updateTask(taskId, taskData, callback) {
    const updates = {
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      assignee: taskData.assignee || '',
      status: taskData.status || 'backlog',
      board: taskData.board || 'pontis-dev',
      updated_at: new Date().toISOString()
    };
    
    // Include task_code if provided
    if (taskData.task_code) {
      updates.task_code = taskData.task_code;
    }

    query('PATCH', `${TABLE}?id=eq.${taskId}`, updates)
      .then(rows => callback(null, { changes: rows.length }))
      .catch(err => callback(err));
  }
  
  // Migrate existing tasks without task_code
  async migrateTaskCodes(callback) {
    try {
      const tasks = await query('GET', `${TABLE}?select=*&order=created_at.asc`);
      const counters = { C: 0, H: 0, M: 0, L: 0 };
      let migrated = 0;
      
      for (const task of tasks) {
        if (!task.task_code) {
          const prefix = { critical: 'C', high: 'H', medium: 'M', low: 'L' }[task.priority] || 'M';
          counters[prefix]++;
          const taskCode = `${prefix}-${counters[prefix].toString().padStart(3, '0')}`;
          
          await query('PATCH', `${TABLE}?id=eq.${task.id}`, { task_code: taskCode });
          migrated++;
        } else {
          // Count existing codes to maintain sequence
          const match = task.task_code.match(/^([CHML])-(\d+)$/);
          if (match) {
            const [, prefix, num] = match;
            counters[prefix] = Math.max(counters[prefix], parseInt(num));
          }
        }
      }
      
      callback(null, { migrated, total: tasks.length, counters });
    } catch (err) {
      callback(err);
    }
  }

  updateTaskStatus(taskId, status, callback) {
    const updates = {
      status,
      updated_at: new Date().toISOString()
    };

    query('PATCH', `${TABLE}?id=eq.${taskId}`, updates)
      .then(rows => callback(null, { changes: rows.length }))
      .catch(err => callback(err));
  }

  deleteTask(taskId, callback) {
    query('DELETE', `${TABLE}?id=eq.${taskId}`)
      .then(rows => callback(null, { changes: rows ? rows.length : 1 }))
      .catch(err => callback(err));
  }

  close() {
    // No-op for Supabase (no persistent connection to close)
    console.log('Supabase client closed (no-op)');
  }
}

module.exports = new Database();
