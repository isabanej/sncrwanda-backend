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

print("Checking Beginning Cash by Period:")
print("=" * 100)

cur.execute("""
    SELECT period_name, year, month, beginning_cash, ending_cash
    FROM ledger.cashflow_periods
    WHERE org_id = %s
    ORDER BY year, month
""", (org_id,))

rows = cur.fetchall()
for row in rows:
    period_name = row[0]
    year = row[1]
    month = row[2]
    beginning = row[3] or 0
    ending = row[4] or 0
    
    marker = " ⭐ START UP CASH" if beginning == 10000000 else ""
    print(f"{period_name:20s} ({year}-{month:02d}) | Beginning: {beginning:>15,.2f} | Ending: {ending:>15,.2f}{marker}")

cur.close()
conn.close()
