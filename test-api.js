const API_BASE = 'http://localhost:3000/api/v1';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/test/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test dashboard endpoint via test route
    console.log('\n2. Testing dashboard endpoint via test route...');
    const dashboardResponse = await fetch(`${API_BASE}/test/dashboard?period=30d`);
    
    if (!dashboardResponse.ok) {
      console.error('❌ Dashboard request failed:', dashboardResponse.status, dashboardResponse.statusText);
      const errorText = await dashboardResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const dashboardData = await dashboardResponse.json();
    console.log('✅ Dashboard data received');
    console.log('Data structure:', Object.keys(dashboardData));
    
    if (dashboardData.data) {
      console.log('Dashboard metrics:', dashboardData.data.metrics);
      console.log('Top products count:', dashboardData.data.topProducts?.length || 0);
      console.log('Recent movements count:', dashboardData.data.recentMovements?.length || 0);
    }

    // Test main dashboard endpoint
    console.log('\n3. Testing main dashboard endpoint...');
    const mainDashboardResponse = await fetch(`${API_BASE}/reports/dashboard?period=30d`);
    
    if (!mainDashboardResponse.ok) {
      console.error('❌ Main dashboard request failed:', mainDashboardResponse.status, mainDashboardResponse.statusText);
      const errorText = await mainDashboardResponse.text();
      console.error('Error details:', errorText);
    } else {
      const mainDashboardData = await mainDashboardResponse.json();
      console.log('✅ Main dashboard data received');
    }

    console.log('\n🎉 API tests completed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Run the test
testAPI(); 