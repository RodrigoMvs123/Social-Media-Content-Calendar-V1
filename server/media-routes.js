const express = require('express');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Route to handle file uploads
router.post('/upload', (req, res) => {
  // Configure formidable
  const form = formidable({
    uploadDir: uploadsDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
    filename: (name, ext, part) => {
      // Create unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return uniqueSuffix + ext;
    }
  });

  try {
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        return res.status(500).json({ error: 'Failed to upload files' });
      }

      // Process uploaded files
      const filesArray = Array.isArray(files.files) ? files.files : [files.files];
      
      if (!filesArray || filesArray.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const mediaFiles = filesArray.map(file => {
        const isImage = file.mimetype.startsWith('image/');
        
        // Get just the filename part of the path
        const filename = path.basename(file.filepath);
        
        return {
          url: `/uploads/${filename}`,
          type: isImage ? 'image' : 'video',
          alt: file.originalFilename
        };
      });

      res.json(mediaFiles);
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

module.exports = router;