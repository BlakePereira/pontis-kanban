# Archive Feature Migration Instructions

## Database Migration Required

Before deploying the archive feature, you need to add the `archived` column to the `kanban_tasks` table in Supabase.

### Option 1: Supabase SQL Editor (Recommended)

1. Go to: https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql
2. Run the following SQL:

```sql
-- Add archived column to kanban_tasks table
ALTER TABLE kanban_tasks 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_archived ON kanban_tasks(archived);

-- Ensure existing tasks are marked as not archived
UPDATE kanban_tasks SET archived = false WHERE archived IS NULL;
```

### Option 2: Using Migration Script

Run the migration script (may require additional setup):

```bash
node run-migration.js
```

## Verification

After running the migration, verify:
1. Column `archived` exists in `kanban_tasks` table
2. All existing tasks have `archived = false`
3. Index `idx_kanban_tasks_archived` is created

## Feature Overview

### Backend Changes
- Added `archived` boolean column (default: false)
- Modified `getAllTasks()` to filter `WHERE archived = false`
- New endpoints:
  - `PATCH /api/tasks/:id/archive` - Archive a task
  - `PATCH /api/tasks/:id/unarchive` - Restore a task
  - `GET /api/tasks/archived` - Get all archived tasks

### Frontend Changes
- Archive button on task cards in Done column
- "📦 Archive" button in header (next to Reports)
- Archive modal showing archived tasks
- Unarchive functionality to restore tasks
- Styled archive UI with appropriate visual indicators

## Testing

1. Complete a task (move to Done column)
2. Click "Archive" button on the task card
3. Verify task disappears from Done column
4. Click "📦 Archive" button in header
5. Verify archived task appears in modal
6. Click "Unarchive" to restore task
7. Verify task reappears in Done column

## Rollback

If needed, to rollback this feature:

```sql
-- Remove archived column
ALTER TABLE kanban_tasks DROP COLUMN IF EXISTS archived;
DROP INDEX IF EXISTS idx_kanban_tasks_archived;
```

Then revert to previous Git commit.
