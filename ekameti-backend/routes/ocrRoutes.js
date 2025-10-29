const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Lazy require to avoid crashing if dependency not installed yet
let Tesseract;
try {
  Tesseract = require('tesseract.js');
} catch (e) {
  Tesseract = null;
}

// Local multer storage for OCR uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Helpers
const extractFieldsFromText = (text) => {
  const normalized = text
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // CNIC: 13 consecutive digits; also capture patterns with dashes
  const cnicWithDashesMatch = normalized.match(/\b(\d{5}-\d{7}-\d)\b/);
  const cnicPlainMatch = normalized.match(/\b(\d{13})\b/);
  const extractedCNIC = cnicWithDashesMatch
    ? cnicWithDashesMatch[1].replace(/-/g, '')
    : (cnicPlainMatch ? cnicPlainMatch[1] : '');

  // Heuristic for name: find lines/segments near keywords
  // Fallback: pick the longest uppercase-ish token sequence
  let extractedName = '';
  const nameKeywords = /name|card\s*holder|bearer|holder/i;
  const segments = text.split(/\n|\r/).map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    const line = segments[i];
    if (nameKeywords.test(line) && i + 1 < segments.length) {
      const next = segments[i + 1].replace(/[^A-Za-z\s]/g, '').trim();
      if (next.split(/\s+/).length >= 2) {
        extractedName = next;
        break;
      }
    }
  }
  if (!extractedName) {
    // Fallback by picking a candidate with 2+ words and mostly letters
    const candidates = segments
      .map(s => s.replace(/[^A-Za-z\s]/g, '').trim())
      .filter(s => s.split(/\s+/).length >= 2 && s.length >= 5);
    extractedName = candidates.sort((a, b) => b.length - a.length)[0] || '';
  }

  return { extractedCNIC, extractedName: extractedName.toUpperCase() };
};

// POST /api/ocr/cnic - accepts multipart image -> returns extracted fields
router.post('/cnic', upload.single('image'), async (req, res) => {
  try {
    console.log('📤 OCR Request received');
    
    if (!req.file) {
      console.error('❌ No image file in request');
      return res.status(400).json({ message: 'No image provided' });
    }

    console.log('📁 File received:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    });

    if (!Tesseract) {
      console.error('❌ Tesseract not loaded');
      return res.status(500).json({
        message: 'OCR engine not available. Please install tesseract.js in backend.',
        hint: 'Run: npm install tesseract.js',
      });
    }

    // Get absolute path and normalize for Windows
    const imagePath = path.resolve(req.file.path).replace(/\\/g, '/');
    console.log('🔍 Processing image at:', imagePath);

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(req.file.path)) {
      console.error('❌ Image file not found at path:', req.file.path);
      return res.status(500).json({ 
        message: 'Uploaded image not found. Please try again.',
        error: 'File not accessible' 
      });
    }

    console.log('⏳ Starting OCR processing with Tesseract...');
    
    // Add timeout wrapper
    const timeoutMs = 45000; // 45 seconds timeout
    const ocrPromise = Tesseract.recognize(imagePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OCR processing timeout')), timeoutMs)
    );

    const { data } = await Promise.race([ocrPromise, timeoutPromise]);

    console.log('✅ OCR completed successfully');

    const rawText = data?.text || '';
    console.log('📄 Extracted text length:', rawText.length, 'characters');
    
    const confidence = Array.isArray(data?.words) && data.words.length
      ? data.words.reduce((sum, w) => sum + (w.confidence || 0), 0) / data.words.length / 100
      : (data?.confidence ? data.confidence / 100 : 0);

    console.log('📊 OCR Confidence:', Math.round(confidence * 100) + '%');

    const { extractedCNIC, extractedName } = extractFieldsFromText(rawText);

    console.log('✅ Extracted Data:', {
      cnic: extractedCNIC || 'Not found',
      name: extractedName || 'Not found',
      confidence: Math.round(confidence * 100) + '%'
    });

    return res.json({
      extractedCNIC,
      extractedName,
      rawText,
      confidence: Number((confidence || 0).toFixed(2)),
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('❌ OCR error:', error.message);
    console.error('❌ Full error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process CNIC image. ';
    
    if (error.message.includes('timeout')) {
      errorMessage += 'Processing took too long. Please use a clearer or smaller image.';
    } else if (error.message.includes('Worker')) {
      errorMessage += 'OCR engine initialization failed. Please try again.';
    } else if (error.message.includes('File') || error.message.includes('ENOENT')) {
      errorMessage += 'Could not read the uploaded file. Please try again.';
    } else {
      errorMessage += 'Please try again with a clearer image.';
    }
    
    return res.status(500).json({ 
      message: errorMessage, 
      error: error.message,
      hint: 'Try uploading a clear, well-lit photo of your CNIC card'
    });
  }
});

// GET /api/ocr/test - Test endpoint to verify OCR is working
router.get('/test', (req, res) => {
  console.log('🧪 OCR Test endpoint hit');
  
  if (!Tesseract) {
    return res.status(500).json({
      status: 'error',
      message: 'Tesseract.js not loaded',
      hint: 'Run: npm install tesseract.js in backend directory',
      installed: false
    });
  }

  res.json({
    status: 'success',
    message: 'OCR engine is available and ready',
    tesseractVersion: Tesseract.version || 'Unknown',
    installed: true
  });
});

module.exports = router;


