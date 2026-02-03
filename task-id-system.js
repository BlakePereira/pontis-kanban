// Simple Task ID System - Works immediately without schema changes
const { KanbanAPI } = require('./kanban-api.js');

class TaskIDSystem {
  constructor() {
    this.kanban = new KanbanAPI();
    this.counters = {
      'critical': 0,
      'high': 0, 
      'medium': 0,
      'low': 0
    };
  }

  // Generate task code based on priority
  generateTaskCode(priority, existingTasks = []) {
    const prefixes = {
      'critical': 'C',
      'high': 'H',
      'medium': 'M', 
      'low': 'L'
    };

    const prefix = prefixes[priority.toLowerCase()] || 'M';
    
    // Count existing tasks with this prefix
    let maxNum = 0;
    existingTasks.forEach(task => {
      if (task.title && task.title.includes(`${prefix}-`)) {
        const match = task.title.match(new RegExp(`${prefix}-(\\d+)`));
        if (match) {
          maxNum = Math.max(maxNum, parseInt(match[1]));
        }
      }
    });

    const nextNum = maxNum + 1;
    return `${prefix}-${nextNum.toString().padStart(3, '0')}`;
  }

  // Add task with auto-generated ID in title
  async addTaskWithID(title, description = '', options = {}) {
    if (!options.priority) {
      throw new Error('Priority is required (critical, high, medium, low)');
    }

    // Get existing tasks to generate proper ID
    const existingTasks = await this.kanban.getAllTasks();
    const taskCode = this.generateTaskCode(options.priority, existingTasks);
    
    // Prepend task code to title
    const titleWithCode = `${taskCode}: ${title}`;

    const taskData = {
      title: titleWithCode,
      description: description ? `🆔 Task ID: ${taskCode}\n\n${description}` : `🆔 Task ID: ${taskCode}`,
      priority: options.priority.toLowerCase(),
      assignee: options.assignee || '',
      status: options.status || 'backlog'
    };

    const result = await this.kanban.createTask(taskData);
    return {
      ...result,
      taskCode,
      originalTitle: title
    };
  }

  // Extract task code from title
  extractTaskCode(title) {
    const match = title.match(/^([CHML]-\d{3}):/);
    return match ? match[1] : null;
  }

  // Get task by ID code
  async getTaskByCode(code) {
    const tasks = await this.kanban.getAllTasks();
    return tasks.find(task => this.extractTaskCode(task.title) === code);
  }
}

module.exports = { TaskIDSystem };