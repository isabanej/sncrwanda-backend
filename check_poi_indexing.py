#!/usr/bin/env python3
import openpyxl

file_path = r"c:\dev\sncrwanda-backend\frontend-new\public\SNC Rwanda - 12 Month Income & Expense Projection = CashflowProjection.xlsx"
workbook = openpyxl.load_workbook(file_path, data_only=True)
sheet = workbook["Cashflow Statement"]

print("CHECKING POI VS OPENPYXL INDEXING")
print("="*80)
print("\nOPENPYXL (1-based):")
print(f"  Row 11, Column B: {sheet.cell(11, 2).value}")  # Should be "Rent"
print(f"  Row 23, Column B: {sheet.cell(23, 2).value}")  # Should be "therapists"

print("\nPOI EQUIVALENT (0-based row, 1-based column in getCell()):")
print(f"  Row 10 (POI getRow(10)), Column 1 (POI getCell(1)): {sheet.cell(11, 2).value}")  # Rent
print(f"  Row 22 (POI getRow(22)), Column 1 (POI getCell(1)): {sheet.cell(23, 2).value}")  # therapists

print("\n" + "="*80)
print("CORRECT: POI row indices are 0-based!")
print("  Excel row 11 = POI getRow(10)")
print("  Excel row 23 = POI getRow(22)")
print("="*80)

print("\nChecking what's actually in POI rows 10-29:")
for poi_row_idx in range(10, 30):
    excel_row = poi_row_idx + 1
    cell_value = sheet.cell(excel_row, 2).value
    if cell_value:
        print(f"POI row {poi_row_idx} (Excel row {excel_row}, Column B): {cell_value}")
