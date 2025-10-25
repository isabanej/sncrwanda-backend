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

print("Fixing cascade of cash balances...")
print("=" * 80)

# September: Start with 10M
cur.execute("""
    UPDATE ledger.cashflow_periods 
    SET beginning_cash = 10000000, 
        ending_cash = 10000000 + 660000 - 2135000
    WHERE org_id = %s AND year = 2025 AND month = 9
""", (org_id,))
print("✅ Sept 2025: Beginning = 10,000,000 | Ending = 8,525,000")

# October: Start with Sept ending
cur.execute("""
    UPDATE ledger.cashflow_periods 
    SET beginning_cash = 8525000, 
        ending_cash = 8525000 + 600000 + 130012 - 1744000
    WHERE org_id = %s AND year = 2025 AND month = 10
""", (org_id,))
print("✅ Oct 2025:  Beginning = 8,525,000 | Ending = 7,511,012")

# November: Start with Oct ending
cur.execute("""
    UPDATE ledger.cashflow_periods 
    SET beginning_cash = 7511012, 
        ending_cash = 7511012 - 800000
    WHERE org_id = %s AND year = 2025 AND month = 11
""", (org_id,))
print("✅ Nov 2025:  Beginning = 7,511,012 | Ending = 6,711,012")

# December: Start with Nov ending
cur.execute("""
    UPDATE ledger.cashflow_periods 
    SET beginning_cash = 6711012, 
        ending_cash = 6711012
    WHERE org_id = %s AND year = 2025 AND month = 12
""", (org_id,))
print("✅ Dec 2025:  Beginning = 6,711,012 | Ending = 6,711,012")

conn.commit()

print("\n" + "=" * 80)
print("Verification:")
print("=" * 80)

cur.execute("""
    SELECT period_name, beginning_cash, ending_cash
    FROM ledger.cashflow_periods
    WHERE org_id = %s AND month IN (9, 10, 11, 12)
    ORDER BY year, month
""", (org_id,))

print(f"{'Period':15s} {'Beginning':>15s} {'Ending':>15s}")
print("=" * 50)
for row in cur.fetchall():
    print(f"{row[0]:15s} {row[1]:>15,.2f} {row[2]:>15,.2f}")

cur.close()
conn.close()

print("\n✅ Cash balances fixed! Current Cash Balance should now show 6,711,012")
