import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const filePath = path.join(__dirname, 'public', 'SNC Rwanda - 12 Month Income & Expense Projection = CashflowProjection.xlsx');

try {
  // Read the workbook
  const workbook = XLSX.readFile(filePath);
  
  console.log('\n📊 EXCEL FILE CONTENTS\n');
  console.log('=====================================\n');
  
  // Get all sheet names
  console.log('📑 Sheet Names:', workbook.SheetNames.join(', '));
  console.log('\n');
  
  // Iterate through each sheet
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 SHEET ${index + 1}: ${sheetName}`);
    console.log('='.repeat(60));
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Display the data
    jsonData.forEach((row, rowIndex) => {
      if (row.length > 0) {
        console.log(`Row ${rowIndex + 1}:`, row.join(' | '));
      }
    });
    
    console.log('\n');
    
    // Extract and display FORMULAS
    console.log('🧮 FORMULAS IN THIS SHEET:');
    console.log('-'.repeat(60));
    
    let formulaCount = 0;
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        
        if (cell && cell.f) {
          formulaCount++;
          const colName = XLSX.utils.encode_col(C);
          const rowNum = R + 1;
          console.log(`  Cell ${cellAddress} (Col ${colName}, Row ${rowNum}):`);
          console.log(`    Formula: ${cell.f}`);
          console.log(`    Result: ${cell.v}`);
          console.log('');
        }
      }
    }
    
    if (formulaCount === 0) {
      console.log('  No formulas found in this sheet.\n');
    } else {
      console.log(`  Total formulas: ${formulaCount}\n`);
    }
    
    console.log('\n');
    
    // Also show as objects (with headers)
    const objectData = XLSX.utils.sheet_to_json(worksheet);
    if (objectData.length > 0) {
      console.log('📋 Data as Objects (first 5 rows):');
      console.log(JSON.stringify(objectData.slice(0, 5), null, 2));
    }
  });
  
  console.log('\n✅ File read successfully!\n');
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
  console.error('Make sure the file exists at:', filePath);
}
