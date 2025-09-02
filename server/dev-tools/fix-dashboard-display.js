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

// Reset filters to default
localStorage.setItem('dashboard-filters', JSON.stringify({
  platform: '',
  dateRange: 'upcoming',
  status: '',
  searchQuery: ''
}));

// Force reload the page
window.location.reload();
