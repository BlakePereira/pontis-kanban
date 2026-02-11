// Simple migration runner for Supabase
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lgvvylbohcboyzahhono.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function runMigration() {
  const migrationPath = path.join(__dirname, 'supabase/migrations/add_archived_column.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration...');
  console.log('SQL:', sql);

  // Split SQL into individual statements (simple split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        // Try direct SQL endpoint if RPC doesn't work
        console.log('Trying alternative approach...');
        console.log('Statement:', statement);
        
        // For ALTER TABLE, we might need to use PostgREST differently
        // Let's just log the SQL for manual execution
        console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
        console.log('---');
        console.log(sql);
        console.log('---\n');
        
        console.log('Go to: https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql');
        process.exit(1);
      }

      console.log('✅ Statement executed successfully');
    } catch (err) {
      console.error('Error executing statement:', err);
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
      console.log('---');
      console.log(sql);
      console.log('---\n');
      console.log('Go to: https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql');
      process.exit(1);
    }
  }

  console.log('✅ Migration completed successfully!');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
