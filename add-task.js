#!/usr/bin/env node

// Quick CLI tool to add tasks to Pontis Kanban via API
// Usage: node add-task.js "Task Title" "Description" "priority" "assignee"

const KANBAN_URL = 'https://pontis-kanban-j8gx.vercel.app';
const PASSWORD = 'PontisSecure2026!K@nban#Blake';

async function addTask(title, description = '', priority = 'medium', assignee = '', status = 'backlog') {
  try {
    // 1. Get JWT token
    const loginRes = await fetch(`${KANBAN_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    
    const { token } = await loginRes.json();
    
    // 2. Create task
    const taskRes = await fetch(`${KANBAN_URL}/api/tasks`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        description,
        priority,
        assignee,
        status
      })
    });
    
    if (!taskRes.ok) {
      throw new Error(`Task creation failed: ${taskRes.status}`);
    }
    
    const result = await taskRes.json();
    console.log('✅ Task created successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const [,, title, description, priority, assignee] = process.argv;
  
  if (!title) {
    console.log('Usage: node add-task.js "Task Title" "Description" "priority" "assignee"');
    console.log('Example: node add-task.js "Fix bug" "Details here" "high" "Blake"');
    process.exit(1);
  }
  
  addTask(title, description, priority, assignee);
}

module.exports = { addTask };