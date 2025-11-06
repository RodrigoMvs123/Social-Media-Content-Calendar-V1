// Debug utilities for production troubleshooting
export const debugProduction = async () => {
  try {
    console.log('🔍 PRODUCTION DEBUG - Starting diagnostic...');
    
    // Test API connectivity
    const response = await fetch('/api/debug');
    const debugData = await response.json();
    
    console.log('🔍 PRODUCTION DEBUG - Server Response:', debugData);
    
    // Test auth endpoint
    try {
      const authResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      console.log('🔍 AUTH DEBUG - Status:', authResponse.status);
      if (authResponse.ok) {
        const authData = await authResponse.json();
        console.log('🔍 AUTH DEBUG - User:', authData);
      } else {
        const authError = await authResponse.text();
        console.log('🔍 AUTH DEBUG - Error:', authError);
      }
    } catch (authErr) {
      console.log('🔍 AUTH DEBUG - Exception:', authErr);
    }
    
    // Test posts endpoint
    try {
      const postsResponse = await fetch('/api/posts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      console.log('🔍 POSTS DEBUG - Status:', postsResponse.status);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        console.log('🔍 POSTS DEBUG - Count:', postsData.length);
        console.log('🔍 POSTS DEBUG - Data:', postsData);
      } else {
        const postsError = await postsResponse.text();
        console.log('🔍 POSTS DEBUG - Error:', postsError);
      }
    } catch (postsErr) {
      console.log('🔍 POSTS DEBUG - Exception:', postsErr);
    }
    
    // Environment info
    console.log('🔍 CLIENT DEBUG - Environment:', {
      url: window.location.href,
      token: localStorage.getItem('auth_token') ? 'EXISTS' : 'MISSING',
      userAgent: navigator.userAgent
    });
    
    return debugData;
  } catch (error) {
    console.error('🔍 PRODUCTION DEBUG - Failed:', error);
    return { error: error.message };
  }
};

// Make it globally available with proper async handling
(window as any).debugProduction = async () => {
  const result = await debugProduction();
  console.log('🔍 PRODUCTION DEBUG - FINAL RESULT:', result);
  return result;
};