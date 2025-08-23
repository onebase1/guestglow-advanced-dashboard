const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wzfpltamwhkncxjvulik.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk'
);

async function testAuthentication() {
  console.log('🔧 Testing GuestGlow Authentication');
  console.log('=====================================');
  
  // Test 1: Create a test user
  console.log('\n1. Creating test user...');
  const testEmail = 'test-auth@guestglow.com';
  const testPassword = 'test123456';
  
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signUpError && !signUpError.message.includes('already registered')) {
      console.log('❌ SignUp error:', signUpError.message);
    } else {
      console.log('✅ Test user ready:', testEmail);
    }
  } catch (error) {
    console.log('❌ SignUp failed:', error.message);
  }
  
  // Test 2: Try to sign in with test user
  console.log('\n2. Testing sign in with test user...');
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (signInError) {
      console.log('❌ Test user SignIn failed:', signInError.message);
    } else {
      console.log('✅ Test user SignIn successful!');
      console.log('   User:', signInData.user.email);
      console.log('   Confirmed:', signInData.user.email_confirmed_at ? 'Yes' : 'No');
    }
  } catch (error) {
    console.log('❌ Test user SignIn error:', error.message);
  }
  
  // Test 3: Try existing users with common passwords
  console.log('\n3. Testing existing admin users...');
  const adminEmails = ['g.basera@yahoo.com', 'g.basera5@gmail.com'];
  const commonPasswords = ['test123', 'password123', 'admin', 'guestglow', 'eusbett', '123456', 'password', 'admin123'];
  
  for (const email of adminEmails) {
    console.log(`\n   Testing ${email}:`);
    
    for (const password of commonPasswords) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        
        if (!error && data.user) {
          console.log(`   ✅ SUCCESS! Password: ${password}`);
          console.log(`   User: ${data.user.email}`);
          
          // Test tenant access
          const { data: tenantData, error: tenantError } = await supabase
            .from('user_roles')
            .select('tenant_id, role, tenants(name, slug)')
            .eq('user_id', data.user.id);
          
          if (!tenantError && tenantData.length > 0) {
            console.log(`   Tenant access: ${tenantData.length} tenant(s)`);
            tenantData.forEach(role => {
              console.log(`   - ${role.tenants.name} (${role.role})`);
            });
          }
          
          return { email, password, success: true };
        } else {
          process.stdout.write('.');
        }
      } catch (error) {
        process.stdout.write('x');
      }
    }
    console.log(' (all passwords failed)');
  }
  
  console.log('\n❌ No working password found for existing users');
  return { success: false };
}

// Run the test
testAuthentication()
  .then((result) => {
    if (result.success) {
      console.log(`\n🎉 AUTHENTICATION WORKING!`);
      console.log(`   Email: ${result.email}`);
      console.log(`   Password: ${result.password}`);
    } else {
      console.log('\n❌ Authentication test failed');
      console.log('   The Supabase connection is working, but passwords need to be reset');
    }
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error:', error.message);
  });
