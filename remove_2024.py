import psycopg2

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="sncrwanda",
    user="postgres",
    password="postgres",
    options='-c search_path=ledger'
)

cur = conn.cursor()

org_id = '550e8400-e29b-41d4-a716-446655440000'

try:
    print("Checking 2024 periods...")
    
    # Get all 2024 period IDs
    cur.execute("""
        SELECT id, period_name FROM cashflow_periods 
        WHERE org_id = %s AND year = 2024
        ORDER BY month
    """, (org_id,))
    
    periods_2024 = cur.fetchall()
    
    if not periods_2024:
        print("✅ No 2024 periods found - already clean!")
    else:
        print(f"Found {len(periods_2024)} periods in 2024:")
        for pid, pname in periods_2024:
            print(f"  - {pname} ({pid})")
        
        print("\nDeleting child records...")
        
        # Disable triggers
        cur.execute("ALTER TABLE ledger.petty_cash_transactions DISABLE TRIGGER ALL")
        
        # Delete child records for each 2024 period
        for pid, pname in periods_2024:
            cur.execute("DELETE FROM ledger.student_fee_payments WHERE period_id = %s", (pid,))
            cur.execute("DELETE FROM ledger.cashflow_expenses WHERE period_id = %s", (pid,))
            cur.execute("DELETE FROM ledger.petty_cash_transactions WHERE period_id = %s", (pid,))
        
        # Re-enable triggers
        cur.execute("ALTER TABLE ledger.petty_cash_transactions ENABLE TRIGGER ALL")
        
        print("Deleting 2024 periods...")
        cur.execute("DELETE FROM ledger.cashflow_periods WHERE org_id = %s AND year = 2024", (org_id,))
        
        conn.commit()
        print(f"✅ Deleted all {len(periods_2024)} periods from 2024")
    
    # Verify final state
    print("\nVerifying remaining years:")
    cur.execute("""
        SELECT year, COUNT(*) FROM cashflow_periods 
        WHERE org_id = %s 
        GROUP BY year 
        ORDER BY year
    """, (org_id,))
    
    years = cur.fetchall()
    for year, count in years:
        print(f"  {year}: {count} periods")

except Exception as e:
    conn.rollback()
    print(f"❌ Error: {e}")
    raise
finally:
    cur.close()
    conn.close()
