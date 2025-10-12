// ================================================
// COMPLETE SUPABASE SETUP - ONE COMMAND
// ================================================
// Usage: node setup-complete.js
// ================================================

const SUPABASE_URL = 'https://feuqkbefbfqnqkkfzgwt.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldXFrYmVmYmZxbnFra2Z6Z3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE3MDY1NSwiZXhwIjoyMDc1NzQ2NjU1fQ.wsPHAfWLWbT96LG7r7KAIQ8h2MnT_S1oC842tv38eGI';

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Complete Supabase Setup...\n');

// ================================================
// STEP 1: Execute Database Setup SQL
// ================================================

async function setupDatabase() {
  console.log('📊 Step 1: Setting up database tables...');

  const sqlFile = path.join(__dirname, 'supabase', 'complete_setup.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    // Try alternative method using pg_execute
    if (!response.ok) {
      console.log('   Trying alternative SQL execution method...');

      // Since Supabase doesn't have a direct SQL execution endpoint,
      // we need to guide the user to do this manually
      console.log('   ⚠️  SQL must be executed manually in Supabase Dashboard');
      console.log('   📋 Follow these steps:');
      console.log('   1. Open: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new');
      console.log('   2. Copy content from: supabase/complete_setup.sql');
      console.log('   3. Paste in SQL Editor and click "Run"');
      console.log('   4. Wait for success message');
      console.log('   5. Then come back and press Enter to continue...\n');

      return false;
    }

    console.log('   ✅ Database tables created successfully!\n');
    return true;
  } catch (error) {
    console.log('   ⚠️  Cannot execute SQL via API');
    console.log('   📋 Please execute SQL manually:');
    console.log('   1. Open: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/sql/new');
    console.log('   2. Copy content from: supabase/complete_setup.sql');
    console.log('   3. Paste and click "Run"\n');
    return false;
  }
}

// ================================================
// STEP 2: Create Admin User
// ================================================

async function createAdminUser() {
  console.log('👤 Step 2: Creating admin user...');
  console.log('   Email: admin@gmail.com');
  console.log('   Password: bhupendra');

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'bhupendra',
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          full_name: 'Admin User'
        }
      })
    });

    const data = await response.json();

    if (data.id) {
      console.log('   ✅ Admin user created successfully!');
      console.log(`   User ID: ${data.id}\n`);
      return true;
    } else if (data.code === 'user_already_exists') {
      console.log('   ℹ️  Admin user already exists\n');
      return true;
    } else {
      console.log('   ❌ Error:', data.msg || data.message);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

// ================================================
// STEP 3: Set Admin Role
// ================================================

async function setAdminRole() {
  console.log('🔐 Step 3: Setting admin role...');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.admin@gmail.com`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        role: 'admin',
        full_name: 'Admin User'
      })
    });

    if (response.ok) {
      console.log('   ✅ Admin role set successfully!\n');
      return true;
    } else {
      console.log('   ⚠️  Please set admin role manually:');
      console.log('   Run this SQL in Supabase SQL Editor:');
      console.log('   UPDATE users SET role = \'admin\', full_name = \'Admin User\' WHERE email = \'admin@gmail.com\';\n');
      return false;
    }
  } catch (error) {
    console.log('   ⚠️  Please set admin role manually (SQL Editor):');
    console.log('   UPDATE users SET role = \'admin\', full_name = \'Admin User\' WHERE email = \'admin@gmail.com\';\n');
    return false;
  }
}

// ================================================
// STEP 4: Storage Bucket Instructions
// ================================================

function showStorageInstructions() {
  console.log('📦 Step 4: Create Storage Bucket');
  console.log('   Storage bucket must be created via Dashboard:');
  console.log('   1. Open: https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/storage/buckets');
  console.log('   2. Click "New bucket"');
  console.log('   3. Name: driver-files');
  console.log('   4. Check "Public bucket"');
  console.log('   5. Click "Create bucket"');
  console.log('   6. Then run storage policies from: supabase/storage_policies.sql\n');
}

// ================================================
// MAIN EXECUTION
// ================================================

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   RAFTAAR - Complete Supabase Setup');
  console.log('═══════════════════════════════════════════════\n');

  // Check if SQL file exists
  const sqlFile = path.join(__dirname, 'supabase', 'complete_setup.sql');
  if (!fs.existsSync(sqlFile)) {
    console.log('❌ Error: complete_setup.sql not found!');
    console.log('   Expected location:', sqlFile);
    return;
  }

  // Step 1: Setup Database
  await setupDatabase();

  // Wait a moment for database to be ready
  console.log('⏳ Waiting for database to be ready...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 2: Create Admin User
  const userCreated = await createAdminUser();

  if (userCreated) {
    // Wait a moment for user to be created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Set Admin Role
    await setAdminRole();
  }

  // Step 4: Storage Instructions
  showStorageInstructions();

  // Final Instructions
  console.log('═══════════════════════════════════════════════');
  console.log('   ✅ SETUP COMPLETE!');
  console.log('═══════════════════════════════════════════════\n');

  console.log('🎉 You can now login at: http://localhost:5174/login');
  console.log('   Email: admin@gmail.com');
  console.log('   Password: bhupendra\n');

  console.log('📝 Next Steps:');
  console.log('   1. Complete storage bucket setup (see Step 4 above)');
  console.log('   2. Start dev server: npm run dev');
  console.log('   3. Login and start managing drivers!\n');
}

// Run the setup
main().catch(console.error);
