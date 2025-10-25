import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("\n============= ORG_ID CHECK =============\n")

# Check org_ids in periods
print("ORG IDs IN CASHFLOW_PERIODS:")
cur.execute("""
    SELECT DISTINCT org_id, COUNT(*)
    FROM cashflow_periods
    GROUP BY org_id
""")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} periods")

# Check org_ids in fees
print("\nORG IDs IN STUDENT_FEE_PAYMENTS:")
cur.execute("""
    SELECT DISTINCT org_id, COUNT(*)
    FROM student_fee_payments
    GROUP BY org_id
""")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} payments")

# Check if Sept period has correct org_id
print("\nSEPT 2025 ORG_ID:")
cur.execute("""
    SELECT id, org_id
    FROM cashflow_periods
    WHERE period_name = 'Sept 2025'
""")
sept = cur.fetchone()
print(f"  Period ID: {sept[0]}")
print(f"  Org ID: {sept[1]}")

# Check fees for Sept period
print("\nFEES FOR SEPT 2025:")
cur.execute("""
    SELECT student_name, amount_paid, org_id
    FROM student_fee_payments
    WHERE period_id = %s
""", (sept[0],))
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]:,} (org: {row[2]})")

print("\n=======================================\n")

cur.close()
conn.close()
