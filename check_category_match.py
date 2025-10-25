#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="sncrwanda",
    user="sncrwanda_user",
    password="SNCRwanda@2025"
)

cursor = conn.cursor()
cursor.execute("SELECT category_name FROM ledger.expense_categories ORDER BY category_name")
categories = [row[0] for row in cursor.fetchall()]

print("Database expense categories:")
for cat in categories:
    print(f"  - {cat}")

print("\n" + "="*80)
print("Excel categories (from rows 10-29):")
excel_cats = [
    "Petty Cash(OUT)",
    "Rent",
    "Training",
    "Equipment",
    "Food Costs",
    "Advertising",
    "Insurance liability",
    "Professional Services / intern",
    "Office Supplies",
    "Website",
    "Repair / Maint.",
    "Supplies",
    "Travel",
    "therapists",
    "Business Phone",
    "Staff Wages",
    "Staff Ovhd (tax, LNI, etc.)",
    "Petty cash",
    "Business Taxes (est.)",
    "Others"
]

for excel_cat in excel_cats:
    # Check for exact match
    exact_match = excel_cat in categories
    
    # Check for case-insensitive match
    ci_match = any(cat.lower() == excel_cat.lower() for cat in categories)
    
    status = "✅ EXACT MATCH" if exact_match else ("🟡 CASE-INSENSITIVE MATCH" if ci_match else "❌ NO MATCH")
    print(f"  {excel_cat}: {status}")
    
    if not exact_match and ci_match:
        matching = [cat for cat in categories if cat.lower() == excel_cat.lower()]
        print(f"      → Would match: {matching[0]}")

conn.close()
