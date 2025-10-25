import psycopg2

conn = psycopg2.connect(host='localhost', port=5432, database='sncrwanda', user='postgres', password='postgres')
cur = conn.cursor()

# Get all fees
cur.execute("""
    SELECT p.month, p.period_name, sfp.student_name, sfp.amount_paid 
    FROM ledger.student_fee_payments sfp 
    JOIN ledger.cashflow_periods p ON sfp.period_id = p.id 
    WHERE p.org_id = '00000000-0000-0000-0000-000000000001' 
    ORDER BY p.month, sfp.student_name
""")

print("Student Fees in Database:")
print("=" * 80)
for row in cur.fetchall():
    print(f"  Month {row[0]:2d} ({row[1]:15s}): {row[2]:20s} - ${row[3]:,.2f}")

# Summary by month
print("\n" + "=" * 80)
print("Summary by Month:")
cur.execute("""
    SELECT p.month, p.period_name, COUNT(*), SUM(sfp.amount_paid)
    FROM ledger.student_fee_payments sfp 
    JOIN ledger.cashflow_periods p ON sfp.period_id = p.id 
    WHERE p.org_id = '00000000-0000-0000-0000-000000000001' 
    GROUP BY p.month, p.period_name
    ORDER BY p.month
""")
for row in cur.fetchall():
    print(f"  {row[1]:15s}: {row[2]} fees, Total: ${row[3]:,.2f}")

cur.close()
conn.close()
