// Script to update the server code to disable mock data
const fs = require('fs');
const path = require('path');

function updateApiFile() {
  try {
    console.log('Updating API configuration to disable mock data...');
    
    // Path to the api.ts file
    const apiFilePath = path.join(__dirname, 'lib', 'api.ts');
    
    // Check if file exists
    if (!fs.existsSync(apiFilePath)) {
      console.log('Searching for api.ts file...');
      
      // Try to find the file in the server directory
      const files = fs.readdirSync(__dirname);
      const apiFile = files.find(file => file === 'api.ts' || file === 'api.js');
      
      if (apiFile) {
        console.log(`Found API file: ${apiFile}`);
        updateFile(path.join(__dirname, apiFile));
      } else {
        console.log('API file not found in root directory. Searching subdirectories...');
        
        // Search in subdirectories
        const dirs = files.filter(file => 
          fs.statSync(path.join(__dirname, file)).isDirectory() && 
          !['node_modules', '.git'].includes(file)
        );
        
        let found = false;
        for (const dir of dirs) {
          const dirPath = path.join(__dirname, dir);
          const dirFiles = fs.readdirSync(dirPath);
          const apiFile = dirFiles.find(file => file === 'api.ts' || file === 'api.js');
          
          if (apiFile) {
            console.log(`Found API file: ${dir}/${apiFile}`);
            updateFile(path.join(dirPath, apiFile));
            found = true;
            break;
          }
        }
        
        if (!found) {
          console.log('API file not found. Please update the USE_MOCK_DATA flag manually.');
        }
      }
    } else {
      updateFile(apiFilePath);
    }
  } catch (error) {
    console.error('Error updating API file:', error);
  }
}

function updateFile(filePath) {
  try {
    console.log(`Updating file: ${filePath}`);
    
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file contains the USE_MOCK_DATA flag
    if (content.includes('USE_MOCK_DATA')) {
      // Replace the flag value
      content = content.replace(
        /const\s+USE_MOCK_DATA\s*=\s*true/g, 
        'const USE_MOCK_DATA = false'
      );
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Successfully updated USE_MOCK_DATA to false');
    } else {
      console.log('USE_MOCK_DATA flag not found in the file');
    }
  } catch (error) {
    console.error(`Error updating file ${filePath}:`, error);
  }
}

updateApiFile();