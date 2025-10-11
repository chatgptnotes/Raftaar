// ================================================
// Create Admin User Automatically
// ================================================
// Usage: node create-admin.js YOUR_SERVICE_ROLE_KEY
// ================================================

const SUPABASE_URL = 'https://feuqkbefbfqnqkkfzgwt.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Service Role Key not provided!');
  console.log('\nUsage:');
  console.log('  node create-admin.js YOUR_SERVICE_ROLE_KEY');
  console.log('\nOr set environment variable:');
  console.log('  export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  console.log('  node create-admin.js');
  console.log('\nGet your Service Role Key from:');
  console.log('  https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/settings/api');
  process.exit(1);
}

const adminData = {
  email: 'admin@gmail.com',
  password: 'bhupendra',
  email_confirm: true,
  user_metadata: {
    role: 'admin',
    full_name: 'Admin User'
  }
};

console.log('🚀 Creating admin user...');
console.log(`   Email: ${adminData.email}`);
console.log(`   Password: ${adminData.password}`);

fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(adminData)
})
.then(response => response.json())
.then(data => {
  if (data.id) {
    console.log('✅ Admin user created successfully!');
    console.log(`   User ID: ${data.id}`);
    console.log(`   Email: ${data.email}`);
    console.log('\n📝 Now run this SQL in Supabase SQL Editor:');
    console.log(`   UPDATE users SET role = 'admin', full_name = 'Admin User' WHERE email = 'admin@gmail.com';`);
    console.log('\n🎉 After that, you can login at: http://localhost:5174/login');
  } else {
    console.error('❌ Error creating admin user:');
    console.error(JSON.stringify(data, null, 2));

    if (data.message && data.message.includes('already exists')) {
      console.log('\n⚠️  User already exists! Just need to set admin role.');
      console.log('   Run this SQL in Supabase SQL Editor:');
      console.log(`   UPDATE users SET role = 'admin', full_name = 'Admin User' WHERE email = 'admin@gmail.com';`);
    }
  }
})
.catch(error => {
  console.error('❌ Network error:', error.message);
  console.log('\n💡 Try creating user manually via Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/feuqkbefbfqnqkkfzgwt/auth/users');
});
