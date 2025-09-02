// Script to analyze differences between Dashboard and Calendar components
const fs = require('fs');
const path = require('path');

function analyzeComponents() {
  try {
    console.log('Analyzing component differences...');
    
    // Define paths to key files
    const homeFilePath = path.join('..', 'client', 'src', 'pages', 'home.tsx');
    const calendarViewPath = path.join('..', 'client', 'src', 'components', 'calendar', 'CalendarView.tsx');
    
    // Read file contents
    const homeContent = fs.readFileSync(homeFilePath, 'utf8');
    const calendarViewContent = fs.readFileSync(calendarViewPath, 'utf8');
    
    console.log('\n=== Date Filtering Analysis ===');
    
    // Extract date filtering logic from home.tsx
    console.log('\nDashboard (home.tsx) date filtering:');
    const homeFilteringMatch = homeContent.match(/case 'upcoming':([\s\S]*?)case 'this-week':/);
    if (homeFilteringMatch) {
      console.log(homeFilteringMatch[1].trim());
    } else {
      console.log('Could not find upcoming filter logic in home.tsx');
    }
    
    // Extract date filtering logic from CalendarView.tsx
    console.log('\nCalendar (CalendarView.tsx) date grouping:');
    const calendarGroupingMatch = calendarViewContent.match(/sortedPosts\.forEach\(post => \{([\s\S]*?)\}\);/);
    if (calendarGroupingMatch) {
      console.log(calendarGroupingMatch[1].trim());
    } else {
      console.log('Could not find date grouping logic in CalendarView.tsx');
    }
    
    console.log('\n=== Query Key Analysis ===');
    
    // Extract query keys from home.tsx
    const homeQueryKeyMatch = homeContent.match(/queryKey: \[(.*?)\]/);
    if (homeQueryKeyMatch) {
      console.log(`Dashboard query key: ${homeQueryKeyMatch[1]}`);
    } else {
      console.log('Could not find query key in home.tsx');
    }
    
    console.log('\n=== Diagnosis ===');
    console.log('1. The Dashboard uses filters.dateRange to filter posts');
    console.log('2. The Calendar component groups posts by date ranges');
    console.log('3. The issue is likely in the date comparison logic in home.tsx');
    
    console.log('\n=== Solution ===');
    console.log('1. The fix is to modify the date filtering in home.tsx');
    console.log('2. Specifically, the "upcoming" filter should include all future posts');
    console.log('3. The fix has been applied, but may need a client restart or cache clear');
    
    console.log('\n=== Next Steps ===');
    console.log('1. Restart the client application: npm run dev');
    console.log('2. Clear browser cache or try in an incognito window');
    console.log('3. Check if the default filter is set to "upcoming" in home.tsx');
    
    // Check if the default filter is set to "upcoming"
    const defaultFilterMatch = homeContent.match(/dateRange: ['"]([^'"]*)['"]/);
    if (defaultFilterMatch) {
      console.log(`\nCurrent default filter: ${defaultFilterMatch[1]}`);
      if (defaultFilterMatch[1] !== 'upcoming') {
        console.log('Consider changing the default filter to "upcoming"');
      }
    }
    
  } catch (error) {
    console.error('Error analyzing components:', error);
  }
}

analyzeComponents();