// Run this in the browser console to fix date display issues

// Function to check if a post is in the next week
function isPostInNextWeek(post) {
  const postDate = new Date(post.scheduledTime);
  const today = new Date();
  const nextWeekStart = new Date(today);
  nextWeekStart.setDate(today.getDate() + 7);
  const nextWeekEnd = new Date(today);
  nextWeekEnd.setDate(today.getDate() + 14);
  
  return postDate >= nextWeekStart && postDate <= nextWeekEnd;
}

// Get all posts from React Query cache
const queryCache = window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__?.getQueryCache?.();
if (queryCache) {
  const queries = queryCache.getAll();
  const postsQuery = queries.find(q => q.queryKey[0] === '/api/calendar');
  
  if (postsQuery && postsQuery.state.data) {
    console.log('Found posts in cache:', postsQuery.state.data);
    
    // Check each post's date
    postsQuery.state.data.forEach(post => {
      console.log(`Post ID ${post.id}: ${post.content.substring(0, 20)}...`);
      console.log(`  Scheduled for: ${post.scheduledTime}`);
      console.log(`  Is next week: ${isPostInNextWeek(post)}`);
      
      // Parse the date to check for issues
      const date = new Date(post.scheduledTime);
      console.log(`  Parsed date: ${date.toISOString()}`);
      console.log(`  Local date: ${date.toString()}`);
    });
  } else {
    console.log('No posts found in cache');
  }
} else {
  console.log('React Query cache not found');
}

// Force a refresh of the posts data
const queryClient = window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__?.getQueryClient?.();
if (queryClient) {
  queryClient.invalidateQueries(['/api/calendar']);
  console.log('Invalidated posts query');
}