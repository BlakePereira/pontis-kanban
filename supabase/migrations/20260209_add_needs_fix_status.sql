-- Add 'needs-fix' status to kanban_tasks between 'progress' and 'testing'
ALTER TABLE kanban_tasks DROP CONSTRAINT kanban_tasks_status_check;
ALTER TABLE kanban_tasks ADD CONSTRAINT kanban_tasks_status_check 
  CHECK (status IN ('backlog', 'progress', 'needs-fix', 'testing', 'done'));
