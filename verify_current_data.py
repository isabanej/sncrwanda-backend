import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("CHECKING DATABASE CONTENTS:")
print("=" * 80)

# Check periods
print("\n1. CASH BALANCES:")
cur.execute("""
    SELECT period_name, beginning_cash, ending_cash 
    FROM cashflow_periods 
    WHERE year=2025 
    ORDER BY month
""")
for row in cur.fetchall():
    print(f"  {row[0]:12} : Beginning={row[1]:>12,} -> Ending={row[2]:>12,}")

# Check student fees by period
print("\n2. STUDENT FEES BY PERIOD:")
cur.execute("""
    SELECT cp.period_name, SUM(sfp.amount_paid) as total_fees
    FROM cashflow_periods cp
    LEFT JOIN student_fee_payments sfp ON cp.id = sfp.period_id
    WHERE cp.year = 2025
    GROUP BY cp.period_name, cp.month
    ORDER BY cp.month
""")
for row in cur.fetchall():
    if row[1] and row[1] > 0:
        print(f"  {row[0]:12} : {row[1]:>12,}")

# Check expenses by period
print("\n3. EXPENSES BY PERIOD:")
cur.execute("""
    SELECT cp.period_name, SUM(ce.amount) as total_expenses
    FROM cashflow_periods cp
    LEFT JOIN cashflow_expenses ce ON cp.id = ce.period_id
    WHERE cp.year = 2025
    GROUP BY cp.period_name, cp.month
    ORDER BY cp.month
""")
for row in cur.fetchall():
    if row[1] and row[1] > 0:
        print(f"  {row[0]:12} : {row[1]:>12,}")

# Check petty cash
print("\n4. PETTY CASH TRANSACTIONS:")
cur.execute("""
    SELECT cp.period_name, pct.transaction_type, pct.amount
    FROM petty_cash_transactions pct
    JOIN cashflow_periods cp ON pct.period_id = cp.id
    WHERE cp.year = 2025
    ORDER BY cp.month
""")
for row in cur.fetchall():
    print(f"  {row[0]:12} {row[1]:4} : {row[2]:>12,}")

print("\n" + "=" * 80)

cur.close()
conn.close()
