import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("\n============= CHECKING PERIOD IDS =============\n")

# Check if there are duplicate periods
print("ALL PERIODS:")
cur.execute("""
    SELECT id, period_name, year, month, beginning_cash, ending_cash
    FROM cashflow_periods
    ORDER BY year, month
""")
for row in cur.fetchall():
    print(f"  {row[0]} | {row[1]} ({row[2]}-{row[3]:02d}) | Begin: {row[4]:,} | End: {row[5]:,}")

# Check Sept 2025 specifically
print("\nSEPT 2025 DETAILS:")
cur.execute("""
    SELECT id, period_name
    FROM cashflow_periods
    WHERE period_name = 'Sept 2025'
""")
sept_periods = cur.fetchall()
for row in sept_periods:
    print(f"  Period ID: {row[0]}")
    
    # Get fees for this period
    cur.execute("""
        SELECT student_name, amount_paid
        FROM student_fee_payments
        WHERE period_id = %s
    """, (row[0],))
    fees = cur.fetchall()
    print(f"  Fees ({len(fees)} payments):")
    for fee in fees:
        print(f"    - {fee[0]}: {fee[1]:,}")

# Check Oct 2025 specifically
print("\nOCT 2025 DETAILS:")
cur.execute("""
    SELECT id, period_name
    FROM cashflow_periods
    WHERE period_name = 'Oct 2025'
""")
oct_periods = cur.fetchall()
for row in oct_periods:
    print(f"  Period ID: {row[0]}")
    
    # Get fees for this period
    cur.execute("""
        SELECT student_name, amount_paid
        FROM student_fee_payments
        WHERE period_id = %s
    """, (row[0],))
    fees = cur.fetchall()
    print(f"  Fees ({len(fees)} payments):")
    for fee in fees:
        print(f"    - {fee[0]}: {fee[1]:,}")

print("\n===================================================\n")

cur.close()
conn.close()
