import psycopg2

# Connect to database
conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

# Check current state
print("BEFORE:")
cur.execute("""
    SELECT period_name, beginning_cash, ending_cash 
    FROM cashflow_periods 
    WHERE year=2025 AND month IN (8,9) 
    ORDER BY month
""")
for row in cur.fetchall():
    print(f"{row[0]}: Beginning={row[1]:,}, Ending={row[2]:,}")

# Move 10M from September to August
# August should start with 10M
# August ending = 10,000,000 - 55,000 (August expenses) = 9,945,000
# September beginning = August ending = 9,945,000
# September ending = 9,945,000 + 660,000 - 2,135,000 = 8,470,000
# October beginning = September ending = 8,470,000

print("\nUpdating August to have 10M beginning balance...")
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 10000000,
        ending_cash = 9945000
    WHERE year=2025 AND month=8
""")

print("Updating September...")
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 9945000,
        ending_cash = 8470000
    WHERE year=2025 AND month=9
""")

print("Updating October...")
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 8470000,
        ending_cash = 7456012
    WHERE year=2025 AND month=10
""")

print("Updating November...")
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 7456012,
        ending_cash = 6656012
    WHERE year=2025 AND month=11
""")

print("Updating December...")
cur.execute("""
    UPDATE cashflow_periods 
    SET beginning_cash = 6656012,
        ending_cash = 6656012
    WHERE year=2025 AND month=12
""")

conn.commit()

# Verify
print("\nAFTER:")
cur.execute("""
    SELECT period_name, beginning_cash, ending_cash 
    FROM cashflow_periods 
    WHERE year=2025 AND month IN (8,9,10,11,12) 
    ORDER BY month
""")
for row in cur.fetchall():
    print(f"{row[0]}: Beginning={row[1]:,}, Ending={row[2]:,}")

print("\n✅ Successfully moved Start-Up capital to August 2025!")
print(f"Current Cash Balance (Dec 2025): {6656012:,}")

cur.close()
conn.close()
