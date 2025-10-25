#!/usr/bin/env python3
import openpyxl

# Load workbook
file_path = r"c:\dev\sncrwanda-backend\frontend-new\public\SNC Rwanda - 12 Month Income & Expense Projection = CashflowProjection.xlsx"
workbook = openpyxl.load_workbook(file_path, data_only=True)
sheet = workbook["Cashflow Statement"]

print("=" * 80)
print("DETAILED ROW 11 (Rent) ANALYSIS")
print("=" * 80)

row_11 = sheet[11]  # 1-based, so row 11
for idx, cell in enumerate(row_11):
    if cell.value:
        col_letter = chr(65 + idx)
        print(f"Column {col_letter} (index {idx}): {cell.value}")

print("\n" + "=" * 80)
print("DETAILED ROW 23 (therapists) ANALYSIS")
print("=" * 80)

row_23 = sheet[23]
for idx, cell in enumerate(row_23):
    if cell.value:
        col_letter = chr(65 + idx)
        print(f"Column {col_letter} (index {idx}): {cell.value}")

print("\n" + "=" * 80)
print("CHECK ROW 1 MONTH HEADERS")
print("=" * 80)

row_1 = sheet[1]
for idx in range(3, 16):  # Columns D-O (POI indices 3-14)
    cell = row_1[idx]
    col_letter = chr(65 + idx)
    print(f"Column {col_letter} (POI index {idx}): {cell.value}")
