// Script to debug date filtering issues
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { parseISO, format, startOfWeek, endOfWeek, addWeeks, isAfter, isBefore } = require('date-fns');

async function debugDateFilters() {
  try {
    const dbPath = './data.sqlite';
    console.log(`Connecting to SQLite database at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established');
    
    // Get all posts
    const posts = await db.all('SELECT * FROM posts ORDER BY scheduledTime');
    console.log(`Found ${posts.length} posts in the database`);
    
    // Current date for reference
    const now = new Date();
    console.log(`Current date: ${format(now, 'yyyy-MM-dd')}`);
    
    // Calculate date ranges
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    
    console.log(`Today: ${format(today, 'yyyy-MM-dd')}`);
    console.log(`Tomorrow: ${format(tomorrow, 'yyyy-MM-dd')}`);
    console.log(`This week: ${format(thisWeekStart, 'yyyy-MM-dd')} to ${format(thisWeekEnd, 'yyyy-MM-dd')}`);
    console.log(`Next week: ${format(nextWeekStart, 'yyyy-MM-dd')} to ${format(nextWeekEnd, 'yyyy-MM-dd')}`);
    
    console.log('\n=== Post Analysis ===');
    
    // Analyze each post
    posts.forEach(post => {
      const postDate = parseISO(post.scheduledTime);
      console.log(`\nPost ID: ${post.id}`);
      console.log(`Content: ${post.content.substring(0, 30)}${post.content.length > 30 ? '...' : ''}`);
      console.log(`Scheduled for: ${format(postDate, 'yyyy-MM-dd HH:mm:ss')}`);
      
      // Check which filters this post matches
      const isUpcoming = isAfter(postDate, today);
      const isToday = postDate >= today && postDate < tomorrow;
      const isThisWeek = isAfter(postDate, thisWeekStart) && isBefore(postDate, thisWeekEnd);
      const isNextWeek = isAfter(postDate, nextWeekStart) && isBefore(postDate, nextWeekEnd);
      
      console.log('Filter matches:');
      console.log(`- Upcoming: ${isUpcoming ? 'YES' : 'NO'}`);
      console.log(`- Today: ${isToday ? 'YES' : 'NO'}`);
      console.log(`- This week: ${isThisWeek ? 'YES' : 'NO'}`);
      console.log(`- Next week: ${isNextWeek ? 'YES' : 'NO'}`);
      
      // Identify issue with next week posts
      if (isNextWeek && !isUpcoming) {
        console.log('ISSUE DETECTED: Post is for next week but not showing in upcoming filter');
      }
    });
    
    console.log('\n=== Fix for Next Week Posts ===');
    console.log('The issue is in the date filtering logic in home.tsx:');
    console.log('1. The "upcoming" filter should include all future posts, including next week');
    console.log('2. The fix is to modify the date comparison in the "upcoming" case');
    console.log('3. Update the code in home.tsx to ensure next week posts are included in upcoming');
    
  } catch (error) {
    console.error('Error debugging date filters:', error);
  }
}

debugDateFilters();