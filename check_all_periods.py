import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("All 2025 periods:")
cur.execute("""
    SELECT period_name, month, beginning_cash, ending_cash 
    FROM cashflow_periods 
    WHERE year=2025 
    ORDER BY month
""")
for row in cur.fetchall():
    print(f"{row[0]} (month {row[1]}): Beginning={row[2]:,}, Ending={row[3]:,}")

cur.close()
conn.close()
