import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres',
    options='-c search_path=ledger'
)

cur = conn.cursor()

print("\n" + "="*80)
print("  FIXING CASCADING CASH BALANCES")
print("="*80)

org_id = '550e8400-e29b-41d4-a716-446655440000'

# Get all periods in order
cur.execute("""
    SELECT id, period_name, year, month, beginning_cash, ending_cash
    FROM cashflow_periods
    WHERE org_id = %s
    ORDER BY year, month
""", (org_id,))

periods = cur.fetchall()

print("\nCurrent state:")
for p in periods:
    print(f"  {p[1]:12} : Begin={p[4]:>12,} → End={p[5]:>12,}")

# Now fix the cascade
print("\nFixing cascade...")

# The ending cash of each period should become the beginning cash of the next period
previous_ending = None

for period in periods:
    period_id = period[0]
    period_name = period[1]
    current_beginning = period[4]
    current_ending = period[5]
    
    # If this is not the first period, set beginning = previous ending
    if previous_ending is not None:
        if current_beginning != previous_ending:
            cur.execute("""
                UPDATE cashflow_periods
                SET beginning_cash = %s
                WHERE id = %s
            """, (previous_ending, period_id))
            print(f"  {period_name:12} : Beginning updated from {current_beginning:,} to {previous_ending:,}")
    
    previous_ending = current_ending

conn.commit()

# Verify the fix
print("\nVerifying cascade:")
cur.execute("""
    SELECT id, period_name, year, month, beginning_cash, ending_cash
    FROM cashflow_periods
    WHERE org_id = %s
    ORDER BY year, month
""", (org_id,))

periods = cur.fetchall()
print("\nFinal state:")
for i, p in enumerate(periods):
    status = ""
    if i > 0:
        prev_ending = periods[i-1][5]
        if p[4] == prev_ending:
            status = " ✅"
        else:
            status = " ❌"
    print(f"  {p[1]:12} : Begin={p[4]:>12,} → End={p[5]:>12,}{status}")

print("\n" + "="*80)
print("  ✅ DONE! Cash balances now cascade correctly.")
print("="*80 + "\n")

cur.close()
conn.close()
