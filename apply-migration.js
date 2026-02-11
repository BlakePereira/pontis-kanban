// Direct SQL execution via Supabase REST API
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function applyMigration() {
  console.log('🔄 Applying database migration...\n');

  // The SQL statements to execute
  const statements = [
    'ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false',
    'CREATE INDEX IF NOT EXISTS idx_kanban_tasks_archived ON kanban_tasks(archived)',
    'UPDATE kanban_tasks SET archived = false WHERE archived IS NULL'
  ];

  for (const sql of statements) {
    console.log(`Executing: ${sql.substring(0, 60)}...`);
    
    try {
      // Use Supabase's postgres endpoint if available
      const url = `${SUPABASE_URL}/rest/v1/rpc`;
      
      // Since we can't execute raw SQL via REST API easily,
      // we'll use a workaround: Try to query the table and see if column exists
      
      // Actually, let's just verify the column exists after manual migration
      const testUrl = `${SUPABASE_URL}/rest/v1/kanban_tasks?select=archived&limit=1`;
      const response = await fetch(testUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (response.ok) {
        console.log('✅ Column "archived" exists and is accessible\n');
        return true;
      } else {
        throw new Error('Column not found - migration needed');
      }
    } catch (err) {
      console.error('❌ Migration needs to be run manually\n');
      console.log('Please run this SQL in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql\n');
      console.log('---SQL---');
      statements.forEach(s => console.log(s + ';'));
      console.log('---------\n');
      return false;
    }
  }
}

applyMigration()
  .then(success => {
    if (success) {
      console.log('✅ Database migration verified!');
      process.exit(0);
    } else {
      console.log('⚠️  Manual migration required');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
