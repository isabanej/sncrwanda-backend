import openpyxl

wb = openpyxl.load_workbook('frontend-new/public/SNC Rwanda - 12 Month Income & Expense Projection = CashflowProjection.xlsx')
sheet = wb['Cashflow Statement']

print("Testing Expense Row Detection:")
print("=" * 80)

# Check rows 10-29 (the range used in Java code)
for row_idx in range(10, 30):
    row = sheet[row_idx]
    category_cell = row[1]  # Column B (index 1)
    
    if category_cell.value:
        category = str(category_cell.value).strip()
        
        # Apply the same filters as Java code
        skip_reasons = []
        
        if not category:
            skip_reasons.append("empty")
        if category.lower() == "total":
            skip_reasons.append("is Total")
        if category.lower() == "cash available":
            skip_reasons.append("is Cash Available")
        if category.lower() == "total expenses":
            skip_reasons.append("is Total Expenses")
        if "petty cash" in category.lower():
            skip_reasons.append("contains petty cash")
        if "Cash In" in category:
            skip_reasons.append("contains Cash In")
        if "Cash Out" in category:
            skip_reasons.append("contains Cash Out")
        
        if skip_reasons:
            print(f"Row {row_idx:2d}: SKIP '{category}' - {', '.join(skip_reasons)}")
        else:
            # Check if there's any data in the month columns
            has_data = False
            for col_idx in range(3, 15):  # Columns D-O (indices 3-14)
                cell_value = sheet.cell(row_idx, col_idx + 1).value  # +1 for 1-based indexing
                if cell_value and isinstance(cell_value, (int, float)) and cell_value > 0:
                    has_data = True
                    break
            
            status = "✅ INCLUDE" if has_data else "⚠️  INCLUDE (but no data)"
            print(f"Row {row_idx:2d}: {status} '{category}'")

wb.close()
