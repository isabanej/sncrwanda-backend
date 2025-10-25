#!/usr/bin/env python3

excel_categories = [
    "Petty Cash(OUT)",  # Row 10
    "Rent",  # Row 11
    "Training",  # Row 12
    "Equipment",  # Row 13
    "Food Costs",  # Row 14
    "Advertising",  # Row 15
    "Insurance liability",  # Row 16
    "Professional Services / intern",  # Row 17
    "Office Supplies",  # Row 18
    "Website",  # Row 19
    "Repair / Maint.",  # Row 20
    "Supplies",  # Row 21
    "Travel",  # Row 22
    "therapists",  # Row 23
    "Business Phone",  # Row 24
    "Staff Wages",  # Row 25
]

db_categories = [
    "Rent",
    "Training",
    "Equipment",
    "Food Costs",
    "Advertising",
    "Professional Services / intern",
    "Office Supplies",
    "Website",
    "Repair / Maint.",
    "Supplies",
    "Therapists",  # Capital T
    "Business Phone",
    "Staff Wages",
    "Insurance liability",
    "Travel",
    "Staff Ovhd (tax, LNI, etc.)",
    "Business Taxes (est.)",
    "Others"
]

category_by_row = {}

for row_idx, category in enumerate(excel_categories, start=10):
    # Apply Java filters
    if not category:
        continue
    if category.lower() == "total":
        continue
    if category.lower() == "cash available":
        continue
    if category.lower() == "total expenses":
        continue
    if "Cash In" in category:
        print(f"Row {row_idx}: '{category}' - FILTERED (contains 'Cash In')")
        continue
    if "Cash Out" in category:
        print(f"Row {row_idx}: '{category}' - FILTERED (contains 'Cash Out')")
        continue
    
    # Try exact match
    if category in db_categories:
        category_by_row[row_idx] = category
        print(f"Row {row_idx}: '{category}' - EXACT MATCH")
    else:
        # Try case-insensitive
        found = False
        for db_cat in db_categories:
            if db_cat.lower() == category.lower():
                category_by_row[row_idx] = db_cat
                print(f"Row {row_idx}: '{category}' - CASE-INSENSITIVE MATCH to '{db_cat}'")
                found = True
                break
        if not found:
            print(f"Row {row_idx}: '{category}' - NO MATCH")

print("\n" + "="*80)
print(f"Total categories matched: {len(category_by_row)}")
print("="*80)
