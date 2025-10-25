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
print("  FIXING AUGUST START UP CAPITAL")
print("="*80)

org_id = '550e8400-e29b-41d4-a716-446655440000'

# August should have Beginning = 10,000,000 (Start Up capital)
# Ending = 10,000,000 - 55,000 (expenses) = 9,945,000

cur.execute("""
    UPDATE cashflow_periods
    SET beginning_cash = 10000000.00
    WHERE org_id = %s AND period_name = 'Aug 2025'
""", (org_id,))

conn.commit()

# Verify
cur.execute("""
    SELECT period_name, beginning_cash, ending_cash
    FROM cashflow_periods
    WHERE org_id = %s
    ORDER BY year, month
""", (org_id,))

print("\nFinal Cash Flow:")
periods = cur.fetchall()
for i, p in enumerate(periods):
    status = ""
    if i > 0:
        prev_ending = periods[i-1][2]
        if p[1] == prev_ending:
            status = " ✅"
        elif p[1] == 0 and prev_ending == 0:
            status = " ✅"
        else:
            status = f" ⚠️ (prev ending={prev_ending:,})"
    print(f"  {p[0]:12} : Begin={p[1]:>12,} → End={p[2]:>12,}{status}")

print("\n" + "="*80)
print("  ✅ DONE! Aug starts with 10M Start Up capital.")
print("="*80 + "\n")

cur.close()
conn.close()
