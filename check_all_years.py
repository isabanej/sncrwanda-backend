import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("All cashflow periods:")
cur.execute("""
    SELECT period_name, year, month, beginning_cash, ending_cash 
    FROM cashflow_periods 
    ORDER BY year, month
""")
rows = cur.fetchall()
if not rows:
    print("No periods found!")
else:
    for row in rows:
        print(f"{row[0]} ({row[1]}-{row[2]:02d}): Beginning={row[3]:,}, Ending={row[4]:,}")

cur.close()
conn.close()
