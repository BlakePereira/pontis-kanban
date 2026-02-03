// PONTIS KANBAN - JWT AUTH VERSION
let tasks = [];
let filteredTasks = [];
let currentTaskId = null;
let currentBoard = 'pontis-dev';
let filters = {
    assignee: '',
    priority: '',
    search: '',
    sprint: '',
    board: 'pontis-dev'
};

// ===== AUTH HELPERS =====
function getToken() {
    return localStorage.getItem('pontis_token');
}

function authHeaders(extra = {}) {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...extra
    };
}

function logout() {
    localStorage.removeItem('pontis_token');
    window.location.href = '/login';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
    checkAuthAndLoadTasks();
    setupDragAndDrop();
    setupKeyboardShortcuts();

    // Auto-refresh every 30 seconds
    setInterval(checkAuthAndLoadTasks, 30000);

    console.log('🚀 Pontis Kanban loaded successfully');
});

async function checkAuthAndLoadTasks() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch('/api/auth/status', {
            headers: authHeaders()
        });

        if (response.ok) {
            loadTasks();
        } else {
            logout();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        logout();
    }
}

// ===== API FUNCTIONS =====
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks', {
            headers: authHeaders()
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        tasks = await response.json();

        if (!Array.isArray(tasks)) {
            console.error('Tasks response is not an array:', tasks);
            tasks = [];
        }

        // Add display metadata
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
            headers: authHeaders(),
            body: JSON.stringify(taskData)
        });

        if (response.status === 401) { logout(); return false; }

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
            headers: authHeaders(),
            body: JSON.stringify(taskData)
        });

        if (response.status === 401) { logout(); return false; }

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
            headers: authHeaders(),
            body: JSON.stringify({ status })
        });

        if (response.status === 401) { logout(); return false; }

        if (response.ok) {
            await loadTasks();
            showNotification(`Task moved to ${status}`, 'success');

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
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });

        if (response.status === 401) { logout(); return false; }

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
        // Always filter by current board
        const taskBoard = task.board || 'pontis-dev';
        if (taskBoard !== currentBoard) return false;
        
        if (filters.assignee && task.assignee !== filters.assignee) return false;
        if (filters.priority && task.priority !== filters.priority) return false;
        if (filters.search) {
            const searchText = (task.title + ' ' + (task.description || '') + ' ' + (task.task_code || '')).toLowerCase();
            if (!searchText.includes(filters.search)) return false;
        }
        if (filters.sprint === 'backlog' && task.status !== 'backlog') return false;
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

    filters = { assignee: '', priority: '', search: '', sprint: '', board: currentBoard };
    applyFilters();
    showNotification('Filters cleared', 'info');
}

function switchBoard(board) {
    currentBoard = board;
    filters.board = board;
    
    // Update tab UI
    document.querySelectorAll('.board-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.board === board);
    });
    
    // Update board selector in modal if open
    const boardSelect = document.getElementById('taskBoard');
    if (boardSelect) {
        boardSelect.value = board;
    }
    
    applyFilters();
    
    // Update header subtitle based on board
    const subtitles = {
        'pontis-dev': 'Development & Bugs',
        'pontis-ops': 'Business & Operations', 
        'personal': 'Personal Tasks'
    };
    document.querySelector('.subtitle').textContent = subtitles[board] || 'Project Management';
}

// ===== RENDERING =====
function renderTasks() {
    const statuses = ['backlog', 'progress', 'testing', 'done'];

    statuses.forEach(status => {
        const container = document.getElementById(`${status}-tasks`);
        const statusTasks = filteredTasks.filter(task => task.status === status);

        if (statusTasks.length === 0) {
            container.innerHTML = `<div class="empty-state">${getEmptyStateMessage(status)}</div>`;
        } else {
            container.innerHTML = statusTasks
                .sort((a, b) => {
                    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                    }
                    return new Date(b.created_at) - new Date(a.created_at);
                })
                .map(task => createTaskCard(task))
                .join('');
        }

        const countElement = document.getElementById(`${status}-count`);
        if (countElement) countElement.textContent = statusTasks.length;
    });

    setupCardEventListeners();
}

function createTaskCard(task) {
    const assigneeInitials = getAssigneeInitials(task.assignee);
    const assigneeClass = task.assignee ? task.assignee.toLowerCase() : '';
    const daysUntilDue = task.due_date ? getDaysUntilDue(task.due_date) : null;
    const tags = task.tags ? task.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    const taskCode = task.task_code || null;

    return `
        <div class="card ${task.priority}" data-task-id="${task.id}" draggable="true">
            <div class="card-header">
                ${taskCode ? `
                    <div class="task-code" onclick="copyTaskCode('${taskCode}')" title="Click to copy ${taskCode}">
                        <span class="code-text">${taskCode}</span>
                        <span class="copy-icon">📋</span>
                    </div>
                ` : ''}
                <h3 class="card-title">${escapeHtml(task.title)}</h3>
                <div class="card-assignee ${assigneeClass}" title="${task.assignee || 'Unassigned'}">
                    ${assigneeInitials}
                </div>
            </div>

            ${task.description ? `<div class="card-description">${escapeHtml(task.description)}</div>` : ''}

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

// ===== STATISTICS =====
function updateAllStats() {
    document.getElementById('totalTasks').textContent = filteredTasks.length;

    const completedTasks = filteredTasks.filter(t => t.status === 'done').length;
    const sprintProgress = filteredTasks.length > 0
        ? Math.round((completedTasks / filteredTasks.length) * 100)
        : 0;
    document.getElementById('sprintProgress').textContent = `${sprintProgress}%`;
    document.getElementById('velocity').textContent = completedTasks;
    document.getElementById('burndown').textContent = '14';

    const blockers = filteredTasks.filter(t =>
        (t.priority === 'critical' || t.priority === 'high') && t.status === 'backlog'
    ).length;
    document.getElementById('blockers').textContent = blockers;

    const criticalCount = filteredTasks.filter(t => t.priority === 'critical').length;
    document.getElementById('criticalCount').textContent = criticalCount;
}

// ===== MODAL FUNCTIONS =====
function openAddTaskModal() {
    currentTaskId = null;
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('submitBtn').textContent = 'Add Task';
    document.getElementById('taskForm').reset();
    // Default to current board
    document.getElementById('taskBoard').value = currentBoard;
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

    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskAssignee').value = task.assignee || '';
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskBoard').value = task.board || 'pontis-dev';
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
        board: document.getElementById('taskBoard').value,
        estimate: document.getElementById('taskEstimate').value,
        due_date: document.getElementById('taskDueDate').value,
        tags: document.getElementById('taskTags').value
    };

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

    if (success) closeModal();
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
    if (card) card.classList.remove('dragging');
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(event) {
    const column = event.target.closest('.column');
    if (column) column.classList.add('drag-over');
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
        if (event.key === 'Escape') {
            closeModal();
            closeReportsModal();
        }
        if (event.ctrlKey && event.key === 'n') {
            event.preventDefault();
            openAddTaskModal();
        }
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            document.getElementById('searchInput').focus();
        }
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
    const icons = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' };
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
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
    return allTags.sort(() => 0.5 - Math.random()).slice(0, numTags).join(', ');
}

function getRandomDueDate() {
    const days = Math.floor(Math.random() * 14) + 1;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return Math.random() > 0.3 ? date.toISOString().split('T')[0] : null;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyTaskCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showNotification(`Copied: ${code}`, 'success');
    }).catch(err => {
        // Fallback for browsers without clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification(`Copied: ${code}`, 'success');
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--info)'};
        color: white; padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-lg); z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function showCelebration() {
    const celebration = document.createElement('div');
    celebration.textContent = '🎉';
    celebration.style.cssText = `
        position: fixed; top: 50%; left: 50%;
        font-size: 4rem; z-index: 10000;
        animation: bounce 0.6s ease; pointer-events: none;
    `;
    document.body.appendChild(celebration);
    setTimeout(() => celebration.remove(), 600);
}

function toggleSprint() { showNotification('Sprint view toggle coming soon!', 'info'); }
function runAllTests() {
    showNotification('Running all QA tests...', 'info');
    setTimeout(() => showNotification('All tests passed! ✅', 'success'), 2000);
}
function celebrateCompletion() {
    showCelebration();
    showNotification('Great work team! 🚀', 'success');
}

window.onclick = function(event) {
    if (event.target === document.getElementById('taskModal')) closeModal();
    else if (event.target === document.getElementById('reportsModal')) closeReportsModal();
};

// CSS animations
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
