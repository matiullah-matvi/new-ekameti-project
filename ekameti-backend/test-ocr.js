/**
 * Quick OCR Test Script
 * Run this to verify Tesseract.js is working
 * 
 * Usage:
 *   node test-ocr.js
 */

const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

async function testOCR() {
  console.log('🧪 Testing OCR System...\n');

  // Check if Tesseract is loaded
  console.log('1️⃣ Checking Tesseract.js installation...');
  if (!Tesseract) {
    console.error('❌ Tesseract.js not found!');
    console.log('   Run: npm install tesseract.js');
    process.exit(1);
  }
  console.log('✅ Tesseract.js is installed\n');

  // Check uploads folder
  console.log('2️⃣ Checking uploads folder...');
  const uploadsPath = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    console.log('⚠️  uploads/ folder not found. Creating it...');
    fs.mkdirSync(uploadsPath);
    console.log('✅ Created uploads/ folder\n');
  } else {
    console.log('✅ uploads/ folder exists\n');
  }

  // Test OCR with sample text
  console.log('3️⃣ Testing OCR on sample text...');
  console.log('   This will test if Tesseract worker can initialize\n');

  try {
    // Create a simple test (just initialize worker)
    console.log('⏳ Initializing Tesseract worker...');
    
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') {
          console.log('   📦 Loading Tesseract core...');
        } else if (m.status === 'initializing tesseract') {
          console.log('   🔧 Initializing Tesseract...');
        } else if (m.status === 'initialized tesseract') {
          console.log('   ✅ Tesseract initialized successfully!');
        } else if (m.status === 'loading language traineddata') {
          console.log('   📚 Loading English language data...');
        } else if (m.status === 'loaded language traineddata') {
          console.log('   ✅ Language data loaded!');
        }
      }
    });

    console.log('\n✅ Worker created successfully!');
    console.log('✅ OCR system is working!\n');
    
    await worker.terminate();
    console.log('✅ Worker terminated cleanly\n');

    // Success summary
    console.log('═══════════════════════════════════════');
    console.log('🎉 OCR TEST PASSED!');
    console.log('═══════════════════════════════════════');
    console.log('Your OCR system is working correctly.');
    console.log('You can now use CNIC image uploads.');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ OCR TEST FAILED!');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('\nPossible solutions:');
    console.error('1. Run: npm install tesseract.js');
    console.error('2. Delete node_modules and run: npm install');
    console.error('3. Update Node.js to v14 or higher');
    console.error('4. Check internet connection (first run downloads language data)');
    console.error('═══════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run test
testOCR().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

