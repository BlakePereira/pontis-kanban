-- Add archived column to kanban_tasks table
-- Default value is false (not archived)

ALTER TABLE kanban_tasks 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Create index on archived column for better query performance
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_archived ON kanban_tasks(archived);

-- Update existing tasks to be not archived
UPDATE kanban_tasks SET archived = false WHERE archived IS NULL;
