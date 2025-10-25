import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

org_id = '550e8400-e29b-41d4-a716-446655440000'

print("Moving Start Up cash from January to September 2025...")
print("=" * 80)

# Move Start Up cash to September
cur.execute("""
    UPDATE ledger.cashflow_periods 
    SET beginning_cash = 10000000 
    WHERE org_id = %s AND year = 2025 AND month = 9
""", (org_id,))
print(f"✅ Set September 2025 beginning_cash to 10,000,000 (updated {cur.rowcount} row)")

# Reset January
cur.execute("""
    UPDATE ledger.cashflow_periods 
    SET beginning_cash = 0 
    WHERE org_id = %s AND year = 2025 AND month = 1
""", (org_id,))
print(f"✅ Reset January 2025 beginning_cash to 0 (updated {cur.rowcount} row)")

conn.commit()

print("\n" + "=" * 80)
print("Verification - Periods with non-zero beginning cash:")
print("=" * 80)

cur.execute("""
    SELECT period_name, year, month, beginning_cash
    FROM ledger.cashflow_periods
    WHERE org_id = %s AND beginning_cash > 0
    ORDER BY year, month
""", (org_id,))

rows = cur.fetchall()
if rows:
    for row in rows:
        print(f"{row[0]:20s} ({row[1]}-{row[2]:02d}): Beginning Cash = {row[3]:>15,.2f}")
else:
    print("⚠️  No periods found with non-zero beginning cash!")

cur.close()
conn.close()

print("\n✅ Done! Start Up cash has been moved to September 2025")
