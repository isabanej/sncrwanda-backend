import openpyxl

wb = openpyxl.load_workbook(r"c:\dev\sncrwanda-backend\frontend-new\public\SNC Rwanda - 12 Month Income & Expense Projection = CashflowProjection.xlsx", data_only=True)

cashflow_sheet = wb["Cashflow Statement"]

print("EXPENSES BY MONTH:")
print("=" * 80)

months = ["Jan", "Fab", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"]

# Row 32 is Total Expenses
print("\nRow 32 (Total Expenses):")
for i, month in enumerate(months):
    col_idx = 3 + i  # Column C = 3 (Jan), D = 4 (Fab), ... K = 11 (Aug), L = 12 (Sept)
    col_letter = openpyxl.utils.get_column_letter(col_idx)
    cell_value = cashflow_sheet.cell(32, col_idx).value
    if cell_value and cell_value != 0:
        print(f"  {month:8} (Col {col_letter}): {cell_value:>12,.0f}")

# Row 33 is Cash Available
print("\nRow 33 (Cash Available after expenses):")
for i, month in enumerate(months):
    col_idx = 3 + i
    col_letter = openpyxl.utils.get_column_letter(col_idx)
    cell_value = cashflow_sheet.cell(33, col_idx).value
    if cell_value and abs(cell_value) > 0.01:
        print(f"  {month:8} (Col {col_letter}): {cell_value:>12,.0f}")

# Row 35 is Ending Cash
print("\nRow 35 (Ending Cash):")
for i, month in enumerate(months):
    col_idx = 3 + i
    col_letter = openpyxl.utils.get_column_letter(col_idx)
    cell_value = cashflow_sheet.cell(35, col_idx).value
    if cell_value and abs(cell_value) > 0.01:
        print(f"  {month:8} (Col {col_letter}): {cell_value:>12,.0f}")

wb.close()
