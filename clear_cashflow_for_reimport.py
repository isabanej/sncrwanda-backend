import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

org_id = '550e8400-e29b-41d4-a716-446655440000'

print("Clearing all cashflow data for organization...")

# Delete in correct order due to foreign keys
cur.execute("DELETE FROM ledger.petty_cash_transactions WHERE period_id IN (SELECT id FROM ledger.cashflow_periods WHERE org_id = %s)", (org_id,))
print(f"Deleted {cur.rowcount} petty cash transactions")

cur.execute("DELETE FROM ledger.cashflow_expenses WHERE period_id IN (SELECT id FROM ledger.cashflow_periods WHERE org_id = %s)", (org_id,))
print(f"Deleted {cur.rowcount} expenses")

cur.execute("DELETE FROM ledger.student_fee_payments WHERE period_id IN (SELECT id FROM ledger.cashflow_periods WHERE org_id = %s)", (org_id,))
print(f"Deleted {cur.rowcount} student fee payments")

cur.execute("DELETE FROM ledger.staff_payroll WHERE period_id IN (SELECT id FROM ledger.cashflow_periods WHERE org_id = %s)", (org_id,))
print(f"Deleted {cur.rowcount} staff payroll")

cur.execute("DELETE FROM ledger.cashflow_periods WHERE org_id = %s", (org_id,))
print(f"Deleted {cur.rowcount} periods")

conn.commit()
print("\n✅ All cashflow data cleared successfully!")

cur.close()
conn.close()
