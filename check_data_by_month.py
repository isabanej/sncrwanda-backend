#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

# Check fees by month
cur.execute("""
    SELECT p.year, p.month,
           sfp.student_name, sfp.amount_paid
    FROM ledger.student_fee_payments sfp
    JOIN ledger.cashflow_periods p ON sfp.period_id = p.id
    WHERE p.org_id = '550e8400-e29b-41d4-a716-446655440000'
    ORDER BY p.year, p.month, sfp.student_name
""")

print("Student Fees by Month:")
print("=" * 80)
for row in cur.fetchall():
    year, month, student, amount = row
    print(f"Year {year} Month {month}: {student} - ${amount:,.2f}")

# Check expenses by month
print("\n\nExpenses by Month:")
print("=" * 80)
cur.execute("""
    SELECT p.year, p.month,
           COUNT(*), SUM(ce.amount)
    FROM ledger.cashflow_expenses ce
    JOIN ledger.cashflow_periods p ON ce.period_id = p.id
    WHERE p.org_id = '550e8400-e29b-41d4-a716-446655440000'
    GROUP BY p.year, p.month
    ORDER BY p.year, p.month
""")

for row in cur.fetchall():
    year, month, count, total = row
    print(f"Year {year} Month {month}: {count} expenses, Total: ${total:,.2f}")

# Check petty cash by month
print("\n\nPetty Cash by Month:")
print("=" * 80)
cur.execute("""
    SELECT p.year, p.month,
           pct.transaction_type, pct.amount
    FROM ledger.petty_cash_transactions pct
    JOIN ledger.cashflow_periods p ON pct.period_id = p.id
    WHERE p.org_id = '550e8400-e29b-41d4-a716-446655440000'
    ORDER BY p.year, p.month
""")

for row in cur.fetchall():
    year, month, txn_type, amount = row
    print(f"Year {year} Month {month}: {txn_type} - ${amount:,.2f}")

cur.close()
conn.close()
