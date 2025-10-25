import psycopg2

conn = psycopg2.connect(host='localhost', port=5432, database='sncrwanda', user='postgres', password='postgres')
cur = conn.cursor()

print("Clearing existing cashflow data...")
cur.execute("DELETE FROM ledger.student_fee_payments")
cur.execute("DELETE FROM ledger.cashflow_expenses")  
cur.execute("DELETE FROM ledger.petty_cash_transactions")
cur.execute("DELETE FROM ledger.cashflow_periods WHERE org_id = '00000000-0000-0000-0000-000000000001'")

conn.commit()
print("✅ Successfully cleared all cashflow data")

cur.close()
conn.close()
