import requests
import psycopg2

# Get September 2025 period ID
conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()
cur.execute("""
    SELECT id, period_name 
    FROM ledger.cashflow_periods 
    WHERE org_id='550e8400-e29b-41d4-a716-446655440000' 
    AND year=2025 AND month=9
""")
row = cur.fetchone()
sept_period_id = row[0]
period_name = row[1]
cur.close()
conn.close()

print(f"Triggering recalculation for {period_name} (ID: {sept_period_id})")
print("=" * 80)

# Trigger recalculation via API
url = f"http://localhost:9090/ledger/api/cashflow/periods/{sept_period_id}/recalculate"
response = requests.post(url)

if response.status_code == 200:
    print("✅ Recalculation triggered successfully!")
    print("\nVerifying results...")
    
    # Check the updated values
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='sncrwanda',
        user='postgres',
        password='postgres'
    )
    cur = conn.cursor()
    cur.execute("""
        SELECT period_name, beginning_cash, ending_cash
        FROM ledger.cashflow_periods
        WHERE org_id='550e8400-e29b-41d4-a716-446655440000'
        AND month IN (9, 10, 11)
        ORDER BY year, month
    """)
    
    print(f"\n{'Period':15s} {'Beginning':>15s} {'Ending':>15s}")
    print("=" * 50)
    for row in cur.fetchall():
        print(f"{row[0]:15s} {row[1]:>15,.2f} {row[2]:>15,.2f}")
    
    cur.close()
    conn.close()
else:
    print(f"❌ Recalculation failed: {response.status_code}")
    print(response.text)
