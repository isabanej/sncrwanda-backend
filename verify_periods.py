import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()
cur.execute("""
    SELECT period_name, beginning_cash, ending_cash 
    FROM cashflow_periods 
    WHERE year=2025 
    ORDER BY month
""")

print("All 2025 periods:")
for row in cur.fetchall():
    print(f"{row[0]:15} : Beginning={row[1]:>12,} → Ending={row[2]:>12,}")

conn.close()
