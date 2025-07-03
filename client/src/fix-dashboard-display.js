// Script to fix dashboard display issues
// Run this in the browser console

(function() {
  console.log('Running dashboard display fix...');
  
  // Force clear React Query cache
  if (window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('Clearing React Query cache...');
    try {
      const queryClient = window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__.getQueryClient();
      if (queryClient) {
        queryClient.clear();
        queryClient.invalidateQueries();
        console.log('Cache cleared successfully');
      }
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
  }
  
  // Check localStorage for filters
  const filters = localStorage.getItem('dashboard-filters');
  if (filters) {
    console.log('Found saved filters:', filters);
    try {
      // Reset filters to default
      localStorage.setItem('dashboard-filters', JSON.stringify({
        platform: '',
        dateRange: 'upcoming',
        status: '',
        searchQuery: ''
      }));
      console.log('Reset filters to default');
    } catch (e) {
      console.error('Error resetting filters:', e);
    }
  }
  
  // Force reload the page
  console.log('Reloading page...');
  window.location.reload();
})();

// To use this script:
// 1. Open your browser's developer console (F12)
// 2. Copy and paste this entire script
// 3. Press Enter to run it
// 4. The page will reload with cleared cache and reset filters