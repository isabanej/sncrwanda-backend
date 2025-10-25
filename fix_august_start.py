import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("FIXING AUGUST START:")
print("=" * 60)

# August should start with 10M and end with 9,945,000 (10M - 55K expenses)
# September should start with 9,945,000 (not 10M!)
# All other months before August should have 0

# Fix January-July (all should be 0)
for month in range(1, 8):
    cur.execute("""
        UPDATE cashflow_periods 
        SET beginning_cash = 0, ending_cash = 0
        WHERE year=2025 AND month=%s
    """, (month,))
    print(f"OK Fixed month {month} to 0")

# August starts with 10M
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 10000000, ending_cash = 9945000
    WHERE year=2025 AND month=8
""")
print("OK August: 10,000,000 -> 9,945,000")

# September starts from August's ending
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 9945000, ending_cash = 8470000
    WHERE year=2025 AND month=9
""")
print("OK September: 9,945,000 -> 8,470,000")

# October
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 8470000, ending_cash = 7456012
    WHERE year=2025 AND month=10
""")
print("OK October: 8,470,000 -> 7,456,012")

# November
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 7456012, ending_cash = 6656012
    WHERE year=2025 AND month=11
""")
print("OK November: 7,456,012 -> 6,656,012")

# December
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 6656012, ending_cash = 6656012
    WHERE year=2025 AND month=12
""")
print("OK December: 6,656,012 -> 6,656,012")

conn.commit()

# Verify
print("\n" + "=" * 60)
print("VERIFICATION:")
print("=" * 60)
cur.execute("""
    SELECT period_name, beginning_cash, ending_cash 
    FROM cashflow_periods 
    WHERE year=2025 
    ORDER BY month
""")
for row in cur.fetchall():
    print(f"{row[0]:12} : Beginning={row[1]:>12,} -> Ending={row[2]:>12,}")

print("\nOK Current Cash Balance (Dec 2025): 6,656,012")

cur.close()
conn.close()
