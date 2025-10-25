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

print("Period Data Distribution:")
print("=" * 80)

cur.execute("""
    SELECT 
        p.period_name,
        p.month,
        COUNT(DISTINCT e.id) as expenses,
        COUNT(DISTINCT f.id) as fees
    FROM ledger.cashflow_periods p
    LEFT JOIN ledger.cashflow_expenses e ON e.period_id = p.id
    LEFT JOIN ledger.student_fee_payments f ON f.period_id = p.id
    WHERE p.org_id = %s
    GROUP BY p.period_name, p.month, p.year
    ORDER BY p.year, p.month
""", (org_id,))

rows = cur.fetchall()
for row in rows:
    period_name = row[0]
    month = row[1]
    expenses = row[2]
    fees = row[3]
    
    data_marker = " 📊 HAS DATA" if (expenses > 0 or fees > 0) else ""
    print(f"{period_name:20s} (month {month:02d}): {expenses:2d} expenses, {fees:2d} fees{data_marker}")

cur.close()
conn.close()
