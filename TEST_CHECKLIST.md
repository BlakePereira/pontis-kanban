# Archive Feature Test Checklist

## Pre-Testing Setup

### 1. Database Migration (REQUIRED)
Before testing, run the SQL migration in Supabase SQL Editor:

**URL:** https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql/new

**SQL to execute:**
```sql
ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_archived ON kanban_tasks(archived);
UPDATE kanban_tasks SET archived = false WHERE archived IS NULL;
```

### 2. Start Local Server
```bash
cd /Users/claraadkinson/.openclaw/workspace/pontis-kanban
npm start
```

Open: http://localhost:3000

## Feature Tests

### Test 1: Archive Button Visibility
- [ ] Navigate to any board
- [ ] Create a task or find existing task
- [ ] Move task to "Done" column
- [ ] Verify "📦 Archive" button appears on task card
- [ ] Verify Archive button does NOT appear on tasks in other columns (Backlog, In Progress, Testing)

### Test 2: Archive Functionality
- [ ] Click "📦 Archive" button on a Done task
- [ ] Confirm the archive dialog
- [ ] Verify task disappears from Done column
- [ ] Verify success notification appears
- [ ] Verify stats are updated (total tasks count decreases)

### Test 3: View Archive Modal
- [ ] Click "📦 Archive" button in header (next to Reports button)
- [ ] Verify archive modal opens
- [ ] Verify archived tasks are displayed
- [ ] Verify each archived task shows:
  - Task code (if exists)
  - Title
  - Description
  - Priority badge
  - Assignee
  - Archive date
  - Unarchive button
  - Delete button

### Test 4: Unarchive Functionality
- [ ] Open archive modal
- [ ] Click "📤 Unarchive" on an archived task
- [ ] Verify success notification
- [ ] Verify task disappears from archive modal
- [ ] Close modal and navigate to board
- [ ] Verify task reappears in Done column
- [ ] Verify task maintains all its properties (assignee, priority, description, etc.)

### Test 5: Delete Archived Task
- [ ] Open archive modal
- [ ] Click "🗑️ Delete" on an archived task
- [ ] Confirm permanent deletion
- [ ] Verify task is removed from archive
- [ ] Verify task is permanently deleted (doesn't reappear anywhere)

### Test 6: Board Filtering
- [ ] Archive tasks from multiple boards
- [ ] Switch between boards
- [ ] Open archive modal
- [ ] Verify archived tasks from ALL boards are visible in archive
- [ ] Note: Archive is currently global across all boards

### Test 7: API Endpoints
Test using curl or browser dev tools:

```bash
# Get active tasks (should exclude archived)
curl http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get archived tasks
curl http://localhost:3000/api/tasks/archived \
  -H "Authorization: Bearer YOUR_TOKEN"

# Archive a task
curl -X PATCH http://localhost:3000/api/tasks/123/archive \
  -H "Authorization: Bearer YOUR_TOKEN"

# Unarchive a task
curl -X PATCH http://localhost:3000/api/tasks/123/unarchive \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 8: Edge Cases
- [ ] Archive multiple tasks consecutively
- [ ] Archive task with special characters in title/description
- [ ] Archive task with no assignee
- [ ] Archive task with all priority levels
- [ ] Test with empty Done column (no crash)
- [ ] Test archive modal with no archived tasks (shows empty state)

### Test 9: UI/UX
- [ ] Verify archive button styling matches other action buttons
- [ ] Verify archive modal is responsive
- [ ] Verify modal close button works (X in corner)
- [ ] Verify clicking outside modal closes it
- [ ] Verify archive success notifications
- [ ] Verify error notifications if something fails

### Test 10: Persistence
- [ ] Archive several tasks
- [ ] Refresh the page
- [ ] Verify archived tasks stay archived
- [ ] Verify active tasks remain visible
- [ ] Open archive modal - verify all archived tasks persist

## Known Limitations

1. **Archive is Global**: Archived tasks from all boards appear in one archive view
   - Future enhancement: Filter archive by board
   
2. **No Archive History**: Only stores most recent archive date
   - Future enhancement: Archive/unarchive history log

3. **No Bulk Operations**: Must archive tasks one at a time
   - Future enhancement: "Archive all completed" button

## Rollback Plan

If issues are found:

1. Switch to main branch: `git checkout main`
2. Remove archived column: 
   ```sql
   ALTER TABLE kanban_tasks DROP COLUMN IF EXISTS archived;
   DROP INDEX IF EXISTS idx_kanban_tasks_archived;
   ```
3. Deploy main branch

## Success Criteria

✅ All tests pass
✅ No console errors
✅ No UI breaks
✅ Performance remains acceptable
✅ Archive/unarchive works reliably
✅ Done column stays clean when tasks are archived
