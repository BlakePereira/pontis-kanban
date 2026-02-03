// Kanban API helper functions
const KANBAN_URL = 'https://pontis-kanban-j8gx.vercel.app';
const PASSWORD = 'PontisSecure2026!K@nban#Blake';

class KanbanAPI {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  async getToken() {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const response = await fetch(`${KANBAN_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    this.token = data.token;
    this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
    
    return this.token;
  }

  async createTask(taskData) {
    const token = await this.getToken();
    
    const response = await fetch(`${KANBAN_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    });

    if (!response.ok) {
      throw new Error(`Task creation failed: ${response.status}`);
    }

    return response.json();
  }

  async getAllTasks() {
    const token = await this.getToken();
    
    const response = await fetch(`${KANBAN_URL}/api/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.status}`);
    }

    return response.json();
  }

  async updateTask(taskId, updates) {
    const token = await this.getToken();
    
    const response = await fetch(`${KANBAN_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Task update failed: ${response.status}`);
    }

    return response.json();
  }

  // Helper method to add task with defaults
  async addTask(title, description = '', options = {}) {
    // Priority is now required
    if (!options.priority) {
      throw new Error('Priority is required (critical, high, medium, low)');
    }

    const taskData = {
      title,
      description,
      priority: options.priority.toLowerCase(),
      assignee: options.assignee || '',
      status: options.status || 'backlog'
    };

    return this.createTask(taskData);
  }
}

module.exports = { KanbanAPI };