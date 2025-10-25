import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("\n============= CHECKING FOR DUPLICATES =============\n")

# Check Sept 2025 fees
print("SEPT 2025 STUDENT FEES:")
cur.execute("""
    SELECT id, student_name, fee_type, amount_paid
    FROM student_fee_payments
    WHERE period_id = (SELECT id FROM cashflow_periods WHERE period_name = 'Sept 2025')
    ORDER BY student_name
""")
sept_fees = cur.fetchall()
for fee in sept_fees:
    print(f"  {fee[1]}: {fee[3]:,}")
print(f"  TOTAL: {sum(f[3] for f in sept_fees):,}\n")

# Check Oct 2025 fees
print("OCT 2025 STUDENT FEES:")
cur.execute("""
    SELECT id, student_name, fee_type, amount_paid
    FROM student_fee_payments
    WHERE period_id = (SELECT id FROM cashflow_periods WHERE period_name = 'Oct 2025')
    ORDER BY student_name
""")
oct_fees = cur.fetchall()
for fee in oct_fees:
    print(f"  {fee[1]}: {fee[3]:,}")
print(f"  TOTAL: {sum(f[3] for f in oct_fees):,}\n")

# Check if there are any duplicate entries
print("CHECKING ALL PERIODS - COUNT OF FEES:")
cur.execute("""
    SELECT p.period_name, COUNT(*) as count, SUM(f.amount_paid) as total
    FROM student_fee_payments f
    JOIN cashflow_periods p ON f.period_id = p.id
    GROUP BY p.period_name, p.year, p.month
    ORDER BY p.year, p.month
""")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} payments = {row[2]:,}")

print("\n===================================================\n")

cur.close()
conn.close()
