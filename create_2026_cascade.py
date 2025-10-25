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
print("  CREATING 2026 PERIODS WITH CASCADE FROM 2025")
print("="*80)

org_id = '550e8400-e29b-41d4-a716-446655440000'

# Get Dec 2025 ending cash
cur.execute("""
    SELECT ending_cash
    FROM cashflow_periods
    WHERE org_id = %s AND year = 2025 AND month = 12
""", (org_id,))

dec_2025_ending = cur.fetchone()
if dec_2025_ending:
    dec_2025_ending = dec_2025_ending[0]
    print(f"\nDec 2025 Ending Cash: {dec_2025_ending:,}")
    print(f"Jan 2026 will start with: {dec_2025_ending:,}")
    
    # Check if 2026 periods exist
    cur.execute("""
        SELECT COUNT(*) FROM cashflow_periods
        WHERE org_id = %s AND year = 2026
    """, (org_id,))
    
    count_2026 = cur.fetchone()[0]
    
    if count_2026 == 0:
        print("\n2026 periods don't exist yet.")
        print("Creating 2026 periods automatically...")
        
        if True:
            print("\nCreating 2026 periods...")
            months = [
                ('Jan 2026', 1), ('Feb 2026', 2), ('Mar 2026', 3), ('Apr 2026', 4),
                ('May 2026', 5), ('Jun 2026', 6), ('Jul 2026', 7), ('Aug 2026', 8),
                ('Sept 2026', 9), ('Oct 2026', 10), ('Nov 2026', 11), ('Dec 2026', 12)
            ]
            
            for period_name, month in months:
                cur.execute("""
                    INSERT INTO cashflow_periods 
                    (id, org_id, year, month, period_name, status, beginning_cash, ending_cash, created_at, last_updated)
                    VALUES (gen_random_uuid(), %s, 2026, %s, %s, 'OPEN', 0, 0, NOW(), NOW())
                """, (org_id, month, period_name))
            
            # Set Jan 2026 beginning = Dec 2025 ending
            cur.execute("""
                UPDATE cashflow_periods
                SET beginning_cash = %s, ending_cash = %s
                WHERE org_id = %s AND year = 2026 AND month = 1
            """, (dec_2025_ending, dec_2025_ending, org_id))
            
            conn.commit()
            print("  ✅ Created 12 periods for 2026")
            print(f"  ✅ Jan 2026 begins with {dec_2025_ending:,}")
    else:
        print(f"\n{count_2026} periods already exist for 2026.")
        print("Updating Jan 2026 to cascade from Dec 2025...")
        
        cur.execute("""
            UPDATE cashflow_periods
            SET beginning_cash = %s
            WHERE org_id = %s AND year = 2026 AND month = 1
        """, (dec_2025_ending, org_id))
        
        conn.commit()
        print(f"  ✅ Jan 2026 beginning updated to {dec_2025_ending:,}")

print("\n" + "="*80)
print("  ✅ DONE!")
print("="*80 + "\n")

cur.close()
conn.close()
