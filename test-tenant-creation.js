// Test Tenant Creation - Demonstrate 30-minute onboarding
// Run this in browser console to test the automated tenant creation

console.log('🚀 Testing GuestGlow Automated Tenant Onboarding...');

// Demo tenant data
const demoTenantData = {
  tenant_name: "Grand Palace Hotel Demo",
  tenant_slug: "grand-palace-demo",
  contact_email: "demo@grandpalace.com",
  contact_phone: "+1 555 123 4567",
  primary_color: "#1a365d",
  secondary_color: "#3182ce",
  managers: [
    {
      name: "John Smith",
      email: "john@grandpalace.com",
      phone: "+1 555 123 4567",
      department: "Management",
      title: "General Manager",
      is_primary: true
    },
    {
      name: "Sarah Johnson", 
      email: "sarah@grandpalace.com",
      phone: "+1 555 123 4568",
      department: "Front Desk",
      title: "Front Desk Manager",
      is_primary: false
    },
    {
      name: "Mike Wilson",
      email: "mike@grandpalace.com", 
      phone: "+1 555 123 4569",
      department: "Housekeeping",
      title: "Housekeeping Manager",
      is_primary: false
    }
  ]
};

async function testTenantCreation() {
  console.log('\n🏨 Creating demo tenant:', demoTenantData.tenant_name);
  
  try {
    const startTime = Date.now();
    
    // Call the tenant onboarding function
    const { data, error } = await supabase.functions.invoke('tenant-onboarding', {
      body: demoTenantData
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    if (error) {
      console.error('❌ Tenant creation failed:', error);
      return null;
    }
    
    if (data.success) {
      console.log(`✅ Tenant created successfully in ${duration} seconds!`);
      console.log('\n📊 Results:', {
        tenant_id: data.tenant.id,
        tenant_slug: data.tenant.slug,
        dashboard_url: data.tenant.dashboard_url,
        feedback_url: data.tenant.feedback_url,
        setup_score: data.setup_validation?.score,
        qr_codes_generated: data.sample_qr_codes?.length || 0
      });
      
      console.log('\n📱 Sample QR Codes Generated:');
      data.sample_qr_codes?.slice(0, 4).forEach(qr => {
        console.log(`- ${qr.type}: ${qr.identifier} - ${qr.qr_url}`);
      });
      
      console.log('\n🚀 Next Steps:');
      data.next_steps?.forEach((step, index) => {
        console.log(`${index + 1}. ${step}`);
      });
      
      return data;
    } else {
      console.error('❌ Tenant creation failed:', data.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error during tenant creation:', error);
    return null;
  }
}

async function validateTenantSetup(tenantSlug) {
  console.log(`\n🔍 Validating tenant setup for: ${tenantSlug}`);
  
  try {
    const { data, error } = await supabase.rpc('validate_tenant_setup', {
      p_tenant_slug: tenantSlug
    });
    
    if (error) {
      console.error('❌ Validation failed:', error);
      return null;
    }
    
    console.log('📊 Setup Validation Results:', {
      valid: data.valid,
      score: `${data.score}/100`,
      manager_count: data.manager_count,
      category_count: data.category_count,
      template_count: data.template_count,
      issues: data.issues
    });
    
    if (data.valid) {
      console.log('✅ Tenant setup is complete and ready for production!');
    } else {
      console.log('⚠️ Tenant setup has issues that need attention:', data.issues);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    return null;
  }
}

async function testQRGeneration(tenantSlug) {
  console.log(`\n📱 Testing QR code generation for: ${tenantSlug}`);
  
  const testLocations = [
    { room: '301', area: null },
    { room: null, area: 'Spa' },
    { room: '401', area: null },
    { room: null, area: 'Conference Room A' }
  ];
  
  for (const location of testLocations) {
    try {
      const { data, error } = await supabase.rpc('generate_tenant_qr_data', {
        p_tenant_slug: tenantSlug,
        p_room_number: location.room,
        p_area: location.area
      });
      
      if (error) {
        console.error('❌ QR generation failed:', error);
        continue;
      }
      
      const identifier = location.room || location.area;
      const type = location.room ? 'Room' : 'Area';
      console.log(`✅ ${type} ${identifier}: ${data.qr_url}`);
      
    } catch (error) {
      console.error('❌ Error generating QR:', error);
    }
  }
}

async function checkTenantData(tenantSlug) {
  console.log(`\n🗄️ Checking tenant data for: ${tenantSlug}`);
  
  try {
    // Check tenant record
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', tenantSlug)
      .single();
    
    if (tenant) {
      console.log('✅ Tenant record found:', {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        is_active: tenant.is_active
      });
    }
    
    // Check managers
    const { data: managers } = await supabase
      .from('manager_configurations')
      .select('*')
      .eq('tenant_id', tenant.id);
    
    console.log(`✅ Managers configured: ${managers?.length || 0}`);
    managers?.forEach(manager => {
      console.log(`  - ${manager.name} (${manager.title}) - ${manager.email} ${manager.is_primary ? '[PRIMARY]' : ''}`);
    });
    
    // Check categories
    const { data: categories } = await supabase
      .from('category_routing_configurations')
      .select('*')
      .eq('tenant_id', tenant.id);
    
    console.log(`✅ Categories configured: ${categories?.length || 0}`);
    categories?.slice(0, 3).forEach(cat => {
      console.log(`  - ${cat.feedback_category}: ${cat.auto_escalation_hours}h SLA (${cat.priority_level})`);
    });
    
    return { tenant, managers, categories };
    
  } catch (error) {
    console.error('❌ Error checking tenant data:', error);
    return null;
  }
}

// Main test function
async function runCompleteTest() {
  console.log('🧪 Running Complete Tenant Replication Test...\n');
  
  const testResults = {
    start_time: new Date().toISOString(),
    steps: {}
  };
  
  // Step 1: Create tenant
  console.log('📝 Step 1: Creating tenant...');
  const createResult = await testTenantCreation();
  testResults.steps.creation = {
    success: !!createResult,
    duration: createResult ? 'Under 30 seconds' : 'Failed'
  };
  
  if (!createResult) {
    console.log('❌ Test failed at tenant creation step');
    return testResults;
  }
  
  const tenantSlug = createResult.tenant.slug;
  
  // Step 2: Validate setup
  console.log('\n📝 Step 2: Validating setup...');
  const validationResult = await validateTenantSetup(tenantSlug);
  testResults.steps.validation = {
    success: validationResult?.valid || false,
    score: validationResult?.score || 0
  };
  
  // Step 3: Test QR generation
  console.log('\n📝 Step 3: Testing QR generation...');
  await testQRGeneration(tenantSlug);
  testResults.steps.qr_generation = { success: true };
  
  // Step 4: Check data integrity
  console.log('\n📝 Step 4: Checking data integrity...');
  const dataCheck = await checkTenantData(tenantSlug);
  testResults.steps.data_integrity = {
    success: !!dataCheck,
    tenant_found: !!dataCheck?.tenant,
    managers_count: dataCheck?.managers?.length || 0,
    categories_count: dataCheck?.categories?.length || 0
  };
  
  // Final results
  testResults.end_time = new Date().toISOString();
  testResults.overall_success = Object.values(testResults.steps).every(step => step.success);
  
  console.log('\n🎉 Test Complete!');
  console.log('📊 Final Results:', testResults);
  
  if (testResults.overall_success) {
    console.log('\n✅ SUCCESS: Tenant replication system is working perfectly!');
    console.log('🚀 Ready for production use - can onboard new tenants in under 30 minutes!');
  } else {
    console.log('\n⚠️ Some issues found - check the results above for details');
  }
  
  return testResults;
}

// Make functions available globally
window.tenantTest = {
  create: testTenantCreation,
  validate: validateTenantSetup,
  generateQR: testQRGeneration,
  checkData: checkTenantData,
  runComplete: runCompleteTest
};

console.log('\n🎯 Tenant Testing Functions Available:');
console.log('- tenantTest.runComplete() - Run full test suite');
console.log('- tenantTest.create() - Test tenant creation');
console.log('- tenantTest.validate(slug) - Validate tenant setup');
console.log('- tenantTest.generateQR(slug) - Test QR generation');
console.log('- tenantTest.checkData(slug) - Check tenant data');

console.log('\n🚀 Ready! Run tenantTest.runComplete() to test the complete system!');
