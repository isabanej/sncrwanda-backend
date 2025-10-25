import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("Checking Beginning Balance in Database:")
print("=" * 80)

cur.execute("""
    SELECT period_name, beginning_balance, total_cash_in, total_expenses, ending_balance
    FROM ledger.cashflow_periods
    WHERE org_id='550e8400-e29b-41d4-a716-446655440000'
    ORDER BY start_date
    LIMIT 5
""")

rows = cur.fetchall()
for row in rows:
    period_name = row[0]
    beginning = row[1] or 0
    cash_in = row[2] or 0
    expenses = row[3] or 0
    ending = row[4] or 0
    
    print(f"{period_name:20s} | Beginning: {beginning:>15,.2f} | Cash In: {cash_in:>15,.2f} | Expenses: {expenses:>15,.2f} | Ending: {ending:>15,.2f}")

print("\n" + "=" * 80)
print("\nChecking if Start Up period exists:")
cur.execute("""
    SELECT period_name, beginning_balance, total_cash_in, total_expenses, ending_balance
    FROM ledger.cashflow_periods
    WHERE org_id='550e8400-e29b-41d4-a716-446655440000'
    AND period_name ILIKE '%start%'
""")

startup_rows = cur.fetchall()
if startup_rows:
    for row in startup_rows:
        print(f"Found: {row[0]} with beginning balance: {row[1]}")
else:
    print("No 'Start Up' period found in database")

cur.close()
conn.close()
