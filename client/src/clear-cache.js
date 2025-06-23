// Script to clear React Query cache
// Add this to your client's index.tsx or main.tsx file temporarily

// Add this import at the top:
// import { QueryClient } from '@tanstack/react-query';

// Replace your existing queryClient with this:
/*
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      cacheTime: 0,
      retry: false,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  },
});
*/

// Or add this button to your app temporarily:
/*
<button 
  onClick={() => {
    queryClient.invalidateQueries();
    queryClient.clear();
    window.localStorage.clear();
    window.location.reload();
  }}
  style={{
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: 9999,
    padding: '8px 16px',
    background: 'red',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }}
>
  Clear Cache
</button>
*/

console.log(`
To clear the React Query cache and fix the dashboard display:

1. Add a temporary clear cache button to your app:
   - Open client/src/App.tsx
   - Add the button code from this file
   - Save and refresh

2. Or manually clear the cache in the browser:
   - Open browser developer tools (F12)
   - Go to Application tab
   - Clear Site Data (localStorage, sessionStorage, etc.)
   - Refresh the page

3. Or modify the query client configuration:
   - Open client/src/lib/queryClient.ts
   - Update the configuration as shown in this file
   - Restart the client app

The issue is likely that the React Query cache is holding onto old filtered data.
`);