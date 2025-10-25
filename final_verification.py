#!/usr/bin/env python3
"""Final verification - compare Excel vs Database totals"""
import psycopg2
import openpyxl

# Database connection
conn = psycopg2.connect(
    host='localhost', port=5432, database='sncrwanda',
    user='postgres', password='postgres'
)
cur = conn.cursor()

# Get database totals
cur.execute("""
    SELECT 
        (SELECT COALESCE(SUM(amount_paid), 0) FROM ledger.student_fee_payments sfp
         JOIN ledger.cashflow_periods p ON sfp.period_id = p.id
         WHERE p.org_id = '550e8400-e29b-41d4-a716-446655440000') as fees,
        (SELECT COALESCE(SUM(amount), 0) FROM ledger.cashflow_expenses ce
         JOIN ledger.cashflow_periods p ON ce.period_id = p.id
         WHERE p.org_id = '550e8400-e29b-41d4-a716-446655440000') as expenses,
        (SELECT COALESCE(SUM(amount), 0) FROM ledger.petty_cash_transactions pct
         JOIN ledger.cashflow_periods p ON pct.period_id = p.id
         WHERE p.org_id = '550e8400-e29b-41d4-a716-446655440000'
         AND transaction_type = 'IN') as petty_in,
        (SELECT COALESCE(SUM(amount), 0) FROM ledger.petty_cash_transactions pct
         JOIN ledger.cashflow_periods p ON pct.period_id = p.id
         WHERE p.org_id = '550e8400-e29b-41d4-a716-446655440000'
         AND transaction_type = 'OUT') as petty_out
""")
db_fees, db_expenses, db_petty_in, db_petty_out = cur.fetchone()
db_fees = float(db_fees)
db_expenses = float(db_expenses)
db_petty_in = float(db_petty_in)
db_petty_out = float(db_petty_out)

# Excel totals (from Revenue sheet)
excel_fees = 1260000.00  # Gaju(600k) + Jed(420k) + nael(240k)
excel_expenses = 4734000.00  # Sum of all expenses
excel_petty_in = 200012.00
excel_petty_out = 70000.00

print("=" * 80)
print("  FINAL VERIFICATION: Excel vs Database")
print("=" * 80)
print()
print(f"Student Fees:")
print(f"  Excel:    ${excel_fees:>15,.2f}")
print(f"  Database: ${db_fees:>15,.2f}")
print(f"  Match:    {'✅ YES' if abs(excel_fees - db_fees) < 0.01 else '❌ NO'}")
print()
print(f"Expenses:")
print(f"  Excel:    ${excel_expenses:>15,.2f}")
print(f"  Database: ${db_expenses:>15,.2f}")
print(f"  Match:    {'✅ YES' if abs(excel_expenses - db_expenses) < 0.01 else '❌ NO'}")
print()
print(f"Petty Cash IN:")
print(f"  Excel:    ${excel_petty_in:>15,.2f}")
print(f"  Database: ${db_petty_in:>15,.2f}")
print(f"  Match:    {'✅ YES' if abs(excel_petty_in - db_petty_in) < 0.01 else '❌ NO'}")
print()
print(f"Petty Cash OUT:")
print(f"  Excel:    ${excel_petty_out:>15,.2f}")
print(f"  Database: ${db_petty_out:>15,.2f}")
print(f"  Match:    {'✅ YES' if abs(excel_petty_out - db_petty_out) < 0.01 else '❌ NO'}")
print()
print("=" * 80)

all_match = (abs(excel_fees - db_fees) < 0.01 and 
             abs(excel_expenses - db_expenses) < 0.01 and
             abs(excel_petty_in - db_petty_in) < 0.01 and
             abs(excel_petty_out - db_petty_out) < 0.01)

if all_match:
    print("  ✅✅✅ ALL DATA MATCHES PERFECTLY! ✅✅✅")
else:
    print("  ❌ Some discrepancies found")
print("=" * 80)

cur.close()
conn.close()
