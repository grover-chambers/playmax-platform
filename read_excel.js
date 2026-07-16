const XLSX = require('xlsx');
const path = require('path');
const wb = XLSX.readFile(path.join('C:\\PLAYMAX\\playmax-platform-master with analytical changes\\playmax-platform-master\\Data', 'first five category suppliers.xlsx'));
console.log('Sheet names:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`\n=== Sheet: ${name} (${data.length} rows) ===`);
  if (data.length > 0) {
    console.log('Headers:', Object.keys(data[0]));
    console.log('First 10 rows:');
    data.slice(0, 10).forEach((r, i) => console.log(`  Row ${i+1}:`, JSON.stringify(r)));
    if (data.length > 10) console.log(`  ... and ${data.length - 10} more rows`);
    // Also show last 3 rows
    if (data.length > 13) {
      console.log('Last 3 rows:');
      data.slice(-3).forEach((r, i) => console.log(`  Row ${data.length - 2 + i}:`, JSON.stringify(r)));
    }
  }
}
