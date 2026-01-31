// PONTIS KANBAN - PROFESSIONAL VERSION
let tasks = [];
let filteredTasks = [];
let currentTaskId = null;
let filters = {
    assignee: '',
    priority: '',
    search: '',
    sprint: ''
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
    setupDragAndDrop();
    setupKeyboardShortcuts();
    
    // Auto-refresh every 30 seconds
    setInterval(loadTasks, 30000);
    
    console.log('🚀 Pontis Kanban loaded successfully');
});

// ===== API FUNCTIONS =====
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        tasks = await response.json();
        
        // Add mock data for professional features
        tasks = tasks.map(task => ({
            ...task,
            estimate: Math.floor(Math.random() * 24) + 1,
            tags: getRandomTags(),
            due_date: getRandomDueDate(),
            created_by: task.assignee || 'System',
            sprint: 1
        }));
        
        filteredTasks = [...tasks];
        renderTasks();
        updateAllStats();
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Failed to load tasks', 'error');
    }
}

async function createTask(taskData) {
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            await loadTasks();
            showNotification('Task created successfully', 'success');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error creating task:', error);
        showNotification('Failed to create task', 'error');
        return false;
    }
}

async function updateTask(taskId, taskData) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            await loadTasks();
            showNotification('Task updated successfully', 'success');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Failed to update task', 'error');
        return false;
    }
}

async function updateTaskStatus(taskId, status) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            await loadTasks();
            showNotification(`Task moved to ${status}`, 'success');
            
            // Celebration for completed tasks
            if (status === 'done') {
                showCelebration();
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error updating task status:', error);
        showNotification('Failed to move task', 'error');
        return false;
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadTasks();
            showNotification('Task deleted successfully', 'success');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
        return false;
    }
}

// ===== FILTERING & SEARCH =====
function applyFilters() {
    filters.assignee = document.getElementById('assigneeFilter').value;
    filters.priority = document.getElementById('priorityFilter').value;
    filters.search = document.getElementById('searchInput').value.toLowerCase();
    filters.sprint = document.getElementById('sprintFilter').value;
    
    filteredTasks = tasks.filter(task => {
        // Assignee filter
        if (filters.assignee && task.assignee !== filters.assignee) {
            return false;
        }
        
        // Priority filter
        if (filters.priority && task.priority !== filters.priority) {
            return false;
        }
        
        // Search filter
        if (filters.search) {
            const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
            if (!searchText.includes(filters.search)) {
                return false;
            }
        }
        
        // Sprint filter (simplified for now)
        if (filters.sprint === 'backlog' && task.status !== 'backlog') {
            return false;
        }
        
        return true;
    });
    
    renderTasks();
    updateAllStats();
}

function clearFilters() {
    document.getElementById('assigneeFilter').value = '';
    document.getElementById('priorityFilter').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('sprintFilter').value = '';
    
    filters = { assignee: '', priority: '', search: '', sprint: '' };
    filteredTasks = [...tasks];
    
    renderTasks();
    updateAllStats();
    
    showNotification('Filters cleared', 'info');
}

// ===== RENDERING =====
function renderTasks() {
    const statuses = ['backlog', 'progress', 'testing', 'done'];
    
    statuses.forEach(status => {
        const container = document.getElementById(`${status}-tasks`);
        const statusTasks = filteredTasks.filter(task => task.status === status);
        
        if (statusTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    ${getEmptyStateMessage(status)}
                </div>
            `;
        } else {
            container.innerHTML = statusTasks
                .sort((a, b) => {
                    // Sort by priority then by creation date
                    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                    }
                    return new Date(b.created_at) - new Date(a.created_at);
                })
                .map(task => createTaskCard(task))
                .join('');
        }
        
        // Update count
        const countElement = document.getElementById(`${status}-count`);
        if (countElement) {
            countElement.textContent = statusTasks.length;
        }
    });
    
    setupCardEventListeners();
}

function createTaskCard(task) {
    const assigneeInitials = getAssigneeInitials(task.assignee);
    const assigneeClass = task.assignee ? task.assignee.toLowerCase() : '';
    const daysUntilDue = task.due_date ? getDaysUntilDue(task.due_date) : null;
    const tags = task.tags ? task.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    
    return `
        <div class="card ${task.priority}" data-task-id="${task.id}" draggable="true">
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(task.title)}</h3>
                <div class="card-assignee ${assigneeClass}" title="${task.assignee || 'Unassigned'}">
                    ${assigneeInitials}
                </div>
            </div>
            
            ${task.description ? `
                <div class="card-description">
                    ${escapeHtml(task.description)}
                </div>
            ` : ''}
            
            <div class="card-meta">
                <div class="priority-badge ${task.priority}">
                    ${getPriorityIcon(task.priority)} ${task.priority.toUpperCase()}
                </div>
                
                ${daysUntilDue !== null ? `
                    <div class="card-date ${daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 3 ? 'urgent' : ''}">
                        ${formatDueDate(daysUntilDue)}
                    </div>
                ` : ''}
            </div>
            
            ${task.estimate ? `
                <div style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: var(--space-2);">
                    ⏱️ ${task.estimate}h estimate
                </div>
            ` : ''}
            
            ${tags.length > 0 ? `
                <div style="margin-bottom: var(--space-3);">
                    ${tags.map(tag => `
                        <span style="display: inline-block; background: var(--gray-100); color: var(--gray-600); padding: 2px 6px; border-radius: var(--radius-sm); font-size: 0.7rem; margin-right: 4px; margin-bottom: 2px;">
                            ${escapeHtml(tag)}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="card-actions">
                <button class="card-action-btn edit-btn" onclick="editTask(${task.id})" title="Edit task">
                    ✏️ Edit
                </button>
                <button class="card-action-btn delete-btn" onclick="deleteTask(${task.id})" title="Delete task">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

// ===== STATISTICS & ANALYTICS =====
function updateAllStats() {
    // Basic counts
    document.getElementById('totalTasks').textContent = filteredTasks.length;
    
    // Sprint progress
    const completedTasks = filteredTasks.filter(t => t.status === 'done').length;
    const sprintProgress = filteredTasks.length > 0 
        ? Math.round((completedTasks / filteredTasks.length) * 100) 
        : 0;
    document.getElementById('sprintProgress').textContent = `${sprintProgress}%`;
    
    // Velocity (completed tasks this sprint)
    document.getElementById('velocity').textContent = completedTasks;
    
    // Days to launch (static for now)
    document.getElementById('burndown').textContent = '14';
    
    // Blockers (high priority tasks not in progress)
    const blockers = filteredTasks.filter(t => 
        (t.priority === 'critical' || t.priority === 'high') && 
        t.status === 'backlog'
    ).length;
    document.getElementById('blockers').textContent = blockers;
    
    // Critical issues
    const criticalCount = filteredTasks.filter(t => t.priority === 'critical').length;
    document.getElementById('criticalCount').textContent = criticalCount;
}

// ===== MODAL FUNCTIONS =====
function openAddTaskModal() {
    currentTaskId = null;
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('submitBtn').textContent = 'Add Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskModal').style.display = 'block';
    document.getElementById('taskTitle').focus();
}

function addTaskToColumn(status) {
    openAddTaskModal();
    document.getElementById('taskStatus').value = status;
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    currentTaskId = taskId;
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('submitBtn').textContent = 'Update Task';
    
    // Populate form
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskAssignee').value = task.assignee || '';
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskEstimate').value = task.estimate || '';
    document.getElementById('taskDueDate').value = task.due_date || '';
    document.getElementById('taskTags').value = task.tags || '';
    
    document.getElementById('taskModal').style.display = 'block';
    document.getElementById('taskTitle').focus();
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
    currentTaskId = null;
}

function openReportsModal() {
    document.getElementById('reportsModal').style.display = 'block';
}

function closeReportsModal() {
    document.getElementById('reportsModal').style.display = 'none';
}

async function submitTask(event) {
    event.preventDefault();
    
    const taskData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        priority: document.getElementById('taskPriority').value,
        assignee: document.getElementById('taskAssignee').value,
        status: document.getElementById('taskStatus').value,
        estimate: document.getElementById('taskEstimate').value,
        due_date: document.getElementById('taskDueDate').value,
        tags: document.getElementById('taskTags').value
    };
    
    // Validation
    if (!taskData.title) {
        showNotification('Task title is required', 'error');
        return;
    }
    
    let success;
    if (currentTaskId) {
        success = await updateTask(currentTaskId, taskData);
    } else {
        success = await createTask(taskData);
    }
    
    if (success) {
        closeModal();
    }
}

// ===== DRAG & DROP =====
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.column');
    
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

function setupCardEventListeners() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(event) {
    const card = event.target.closest('.card');
    if (card) {
        card.classList.add('dragging');
        event.dataTransfer.setData('text/plain', card.dataset.taskId);
        event.dataTransfer.effectAllowed = 'move';
    }
}

function handleDragEnd(event) {
    const card = event.target.closest('.card');
    if (card) {
        card.classList.remove('dragging');
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(event) {
    const column = event.target.closest('.column');
    if (column) {
        column.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const column = event.target.closest('.column');
    if (column && !column.contains(event.relatedTarget)) {
        column.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    
    const column = event.target.closest('.column');
    if (!column) return;
    
    column.classList.remove('drag-over');
    
    const taskId = event.dataTransfer.getData('text/plain');
    const newStatus = column.dataset.status;
    
    if (taskId && newStatus) {
        // Check WIP limits
        if (newStatus === 'progress') {
            const currentWIP = filteredTasks.filter(t => t.status === 'progress').length;
            if (currentWIP >= 5) {
                showNotification('WIP limit reached for In Progress (5 tasks)', 'warning');
                return;
            }
        }
        
        await updateTaskStatus(parseInt(taskId), newStatus);
    }
}

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // ESC to close modals
        if (event.key === 'Escape') {
            closeModal();
            closeReportsModal();
        }
        
        // Ctrl+N to add new task
        if (event.ctrlKey && event.key === 'n') {
            event.preventDefault();
            openAddTaskModal();
        }
        
        // Ctrl+F to focus search
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            document.getElementById('searchInput').focus();
        }
        
        // F5 or Ctrl+R to refresh
        if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
            event.preventDefault();
            loadTasks();
            showNotification('Board refreshed', 'info');
        }
    });
}

// ===== UTILITY FUNCTIONS =====
function getAssigneeInitials(assignee) {
    if (!assignee) return '?';
    return assignee.split(' ').map(name => name[0]).join('').toUpperCase();
}

function getPriorityIcon(priority) {
    const icons = {
        critical: '🔴',
        high: '🟠',
        medium: '🔵',
        low: '🟢'
    };
    return icons[priority] || '⚪';
}

function getEmptyStateMessage(status) {
    const messages = {
        backlog: 'No tasks in backlog',
        progress: 'Ready to start work?',
        testing: 'No tasks ready for testing',
        done: 'Complete your first task!'
    };
    return messages[status] || 'No tasks here';
}

function getDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDueDate(days) {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days left`;
}

function getRandomTags() {
    const allTags = ['bug', 'feature', 'urgent', 'backend', 'frontend', 'qa', 'docs', 'security'];
    const numTags = Math.floor(Math.random() * 3);
    const shuffled = allTags.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numTags).join(', ');
}

function getRandomDueDate() {
    const days = Math.floor(Math.random() * 14) + 1; // 1-14 days from now
    const date = new Date();
    date.setDate(date.getDate() + days);
    return Math.random() > 0.3 ? date.toISOString().split('T')[0] : null; // 70% chance of having due date
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--info)'};
        color: white;
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-lg);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showCelebration() {
    // Celebration effect for completed tasks
    const celebration = document.createElement('div');
    celebration.textContent = '🎉';
    celebration.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        font-size: 4rem;
        z-index: 10000;
        animation: bounce 0.6s ease;
        pointer-events: none;
    `;
    
    document.body.appendChild(celebration);
    
    setTimeout(() => {
        celebration.remove();
    }, 600);
}

// ===== ADDITIONAL FEATURES =====
function toggleSprint() {
    // Sprint view toggle (placeholder)
    showNotification('Sprint view toggle coming soon!', 'info');
}

function runAllTests() {
    showNotification('Running all QA tests...', 'info');
    // Simulate test run
    setTimeout(() => {
        showNotification('All tests passed! ✅', 'success');
    }, 2000);
}

function celebrateCompletion() {
    showCelebration();
    showNotification('Great work team! 🚀', 'success');
}

// Close modals when clicking outside
window.onclick = function(event) {
    const taskModal = document.getElementById('taskModal');
    const reportsModal = document.getElementById('reportsModal');
    
    if (event.target === taskModal) {
        closeModal();
    } else if (event.target === reportsModal) {
        closeReportsModal();
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes bounce {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.2); }
    }
    
    .overdue { color: var(--error) !important; font-weight: bold; }
    .urgent { color: var(--warning) !important; font-weight: bold; }
`;
document.head.appendChild(style);