#!/usr/bin/env python3
import requests

# Login first
response = requests.post(
    "http://localhost:9092/api/auth/login",
    json={"email": "admin@sncrwanda.org", "password": "admin123"}
)
token = response.json().get("token")

# Query database via Python script using JDBC or just check logs
# For now, let's list the categories from migration file

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
    "Therapists",  # NOTE: Capital T
    "Business Phone",
    "Staff Wages",
    "Insurance liability",
    "Travel",
    "Staff Ovhd (tax, LNI, etc.)",
    "Business Taxes (est.)",
    "Others"
]

print("="*80)
print("CATEGORY MATCHING ANALYSIS")
print("="*80)

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
    "therapists",  # NOTE: lowercase t
    "Business Phone",
    "Staff Wages",
    "Staff Ovhd (tax, LNI, etc.)",
    "Petty cash",  # lowercase
    "Business Taxes (est.)",
    "Others"
]

for excel_cat in excel_cats:
    # Check for exact match
    exact_match = excel_cat in db_categories
    
    # Check for case-insensitive match
    ci_match = any(cat.lower() == excel_cat.lower() for cat in db_categories)
    
    if exact_match:
        print(f"✅ {excel_cat}")
    elif ci_match:
        matching = [cat for cat in db_categories if cat.lower() == excel_cat.lower()]
        print(f"🟡 {excel_cat}")
        print(f"   → Would match DB: {matching[0]}")
    else:
        print(f"❌ {excel_cat} - NO MATCH IN DATABASE")
