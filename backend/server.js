const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const { removeBackground } = require('@imgly/background-removal-node');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all requests
app.use(cors());

// Configure Multer to hold uploaded files in memory
// using a generous limit (20MB) to allow for common ecommerce standards
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB limit
  },
});

// Helper function to extract filename without extension
const getFilenameWithoutExtension = (filename) => {
  return filename.split('.').slice(0, -1).join('.');
};

// API Route for processing images
app.post('/api/process-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const { width, format, quality, removeBg } = req.body;
    let inputBuffer = req.file.buffer;

    if (removeBg === 'true') {
      try {
        console.log("Starting background removal...");
        // removeBackground accepts Blob
        const blob = new Blob([inputBuffer], { type: req.file.mimetype });
        const removedBlob = await removeBackground(blob);
        inputBuffer = Buffer.from(await removedBlob.arrayBuffer());
        console.log("Background removal complete.");
      } catch (err) {
        console.error("AI Removal Failed", err);
        return res.status(500).json({ error: 'AI Background Removal Failed', details: err.message });
      }
    }

    // Initialize sharp instance with the buffer
    let transform = sharp(inputBuffer);

    // Apply resizing if width is specified
    if (width && !isNaN(width)) {
      transform = transform.resize({
        width: parseInt(width, 10),
        withoutEnlargement: true // Don't upscale if the image is smaller than requested width
      });
    }

    // Apply formatting and quality settings
    const parsedQuality = quality && !isNaN(quality) ? parseInt(quality, 10) : 80;
    const targetFormat = format || 'jpeg'; // Default to jpeg if not provided

    if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
      transform = transform.jpeg({ quality: parsedQuality });
    } else if (targetFormat === 'png') {
      // PNG quality is primarily about compression level rather than visual loss, 
      // but sharp allows some compression tuning.
      transform = transform.png({ quality: parsedQuality });
    } else if (targetFormat === 'webp') {
      transform = transform.webp({ quality: parsedQuality });
    } else {
       return res.status(400).json({ error: 'Unsupported format. Use jpeg, png, or webp.' });
    }

    // Get the processed image buffer and info
    const processedBuffer = await transform.toBuffer();

    const originalName = getFilenameWithoutExtension(req.file.originalname);
    const newFilename = `${originalName}-processed.${targetFormat}`;

    // Set headers to prompt a file download or display properly
    res.set({
      'Content-Type': `image/${targetFormat}`,
      'Content-Disposition': `inline; filename="${newFilename}"`,
      'Content-Length': processedBuffer.length,
      // Custom headers to send metadata about processing back to frontend
      'X-Original-Size': req.file.size,
      'X-Processed-Size': processedBuffer.length,
      'Access-Control-Expose-Headers': 'X-Original-Size, X-Processed-Size, Content-Disposition'
    });

    // Send the buffer directly back to the client
    res.end(processedBuffer);

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Image Processing Server running on http://localhost:${port}`);
});
