const fs = require('fs');
const c = fs.readFileSync('PLAYMAX/playmax-platform-master with analytical changes/playmax-platform/src/app/app/analytics/upload/page.tsx', 'utf8');

// Find handleParse
const parseIdx = c.indexOf('const handleParse');
if (parseIdx > -1) {
  console.log('=== handleParse ===');
  console.log(c.substring(parseIdx, parseIdx + 2000));
}

// Find applyMapping
const applyIdx = c.indexOf('const applyMapping');
if (applyIdx > -1) {
  console.log('=== applyMapping ===');
  console.log(c.substring(applyIdx, applyIdx + 1500));
}

// Find handleImport
const importIdx = c.indexOf('const handleImport');
if (importIdx > -1) {
  console.log('=== handleImport ===');
  console.log(c.substring(importIdx, importIdx + 2000));
}