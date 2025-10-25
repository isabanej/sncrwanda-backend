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

print("Petty Cash Analysis:")
print("=" * 80)

cur.execute("""
    SELECT 
        SUM(CASE WHEN transaction_type='IN' THEN amount ELSE 0 END) as total_in,
        SUM(CASE WHEN transaction_type='OUT' THEN amount ELSE 0 END) as total_out
    FROM ledger.petty_cash_transactions
    WHERE period_id IN (
        SELECT id FROM ledger.cashflow_periods WHERE org_id = %s
    )
""", (org_id,))

row = cur.fetchone()
total_in = row[0] or 0
total_out = row[1] or 0
net_balance = total_in - total_out

print(f"Total Petty Cash IN:  {total_in:>15,.2f}")
print(f"Total Petty Cash OUT: {total_out:>15,.2f}")
print(f"=" * 80)
print(f"Net Petty Cash:       {net_balance:>15,.2f}")

cur.close()
conn.close()
