import psycopg2
from psycopg2 import sql

# Database connection
conn = psycopg2.connect(
    dbname="sncrwanda",
    user="postgres",
    password="postgres",
    host="localhost",
    port="5432"
)

cursor = conn.cursor()

# First, drop the old check constraint
drop_constraint_sql = """
ALTER TABLE ledger.cashflow_periods 
DROP CONSTRAINT IF EXISTS cashflow_periods_status_check;
"""

# Add new check constraint with CLOSED status
add_constraint_sql = """
ALTER TABLE ledger.cashflow_periods 
ADD CONSTRAINT cashflow_periods_status_check 
CHECK (status IN ('OPEN', 'LATE_ENTRY_PERIOD', 'CLOSED', 'LOCKED'));
"""

# Update existing LOCKED periods that are in the past to CLOSED
update_sql = """
UPDATE ledger.cashflow_periods
SET status = 'CLOSED'
WHERE status = 'LOCKED'
  AND (year < EXTRACT(YEAR FROM CURRENT_DATE) 
       OR (year = EXTRACT(YEAR FROM CURRENT_DATE) AND month < EXTRACT(MONTH FROM CURRENT_DATE)));
"""

try:
    print("🔧 Dropping old check constraint...")
    cursor.execute(drop_constraint_sql)
    
    print("✅ Adding new check constraint with CLOSED status...")
    cursor.execute(add_constraint_sql)
    
    print("🔄 Updating past LOCKED periods to CLOSED...")
    cursor.execute(update_sql)
    
    conn.commit()
    print(f"✅ Migration completed successfully!")
    print(f"   Updated {cursor.rowcount} periods from LOCKED to CLOSED")
    
    # Verify the changes
    cursor.execute("""
        SELECT status, COUNT(*) 
        FROM ledger.cashflow_periods 
        GROUP BY status 
        ORDER BY status
    """)
    
    print("\n📊 Period status distribution:")
    for row in cursor.fetchall():
        print(f"   {row[0]}: {row[1]}")
        
except Exception as e:
    conn.rollback()
    print(f"❌ Error running migration: {e}")
finally:
    cursor.close()
    conn.close()
