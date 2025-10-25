import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("\n============= CHECKING SCHEMAS =============\n")

# Check public schema
print("PUBLIC SCHEMA:")
cur.execute("""
    SELECT COUNT(*) FROM public.cashflow_periods
""")
print(f"  cashflow_periods: {cur.fetchone()[0]} records")

cur.execute("""
    SELECT COUNT(*) FROM public.student_fee_payments
""")
print(f"  student_fee_payments: {cur.fetchone()[0]} records")

# Check ledger schema
print("\nLEDGER SCHEMA:")
cur.execute("""
    SELECT COUNT(*) FROM ledger.cashflow_periods
""")
print(f"  cashflow_periods: {cur.fetchone()[0]} records")

cur.execute("""
    SELECT COUNT(*) FROM ledger.student_fee_payments
""")
print(f"  student_fee_payments: {cur.fetchone()[0]} records")

print("\n==========================================\n")

cur.close()
conn.close()
