import psycopg2
from datetime import datetime, date, timedelta
from calendar import monthrange

# Database connection
conn = psycopg2.connect(
    dbname="sncrwanda",
    user="postgres",
    password="postgres",
    host="localhost",
    port="5432"
)

cursor = conn.cursor()

current_date = date.today()
current_year = current_date.year
current_month = current_date.month

# Calculate previous month
if current_month == 1:
    prev_month = 12
    prev_year = current_year - 1
else:
    prev_month = current_month - 1
    prev_year = current_year

# Calculate late entry deadline for previous month (5 days after month end)
_, last_day = monthrange(prev_year, prev_month)
prev_month_end = date(prev_year, prev_month, last_day)
late_entry_deadline = prev_month_end + timedelta(days=5)
days_since_prev_month_end = (current_date - prev_month_end).days
late_entry_deadline_str = late_entry_deadline.strftime('%Y-%m-%d') + ' 23:59:59'

print(f"Current month: {current_year}-{current_month:02d}")
print(f"Previous month: {prev_year}-{prev_month:02d}")
print(f"Late entry deadline: {late_entry_deadline_str}")

try:
    # Set current month to OPEN
    cursor.execute("""
        UPDATE ledger.cashflow_periods
        SET status = 'OPEN', last_updated = CURRENT_TIMESTAMP
        WHERE year = %s AND month = %s
    """, (current_year, current_month))
    print(f"\n✅ Set {current_year}-{current_month:02d} (Oct 2025) to OPEN")
    
    # Check if we're within 5 days of previous month end
    if days_since_prev_month_end <= 5:
        # We're still within the grace period
        cursor.execute("""
            UPDATE ledger.cashflow_periods
            SET status = 'LATE_ENTRY_PERIOD', 
                late_entry_deadline = %s::timestamp,
                last_updated = CURRENT_TIMESTAMP
            WHERE year = %s AND month = %s
        """, (late_entry_deadline_str, prev_year, prev_month))
        print(f"✅ Set {prev_year}-{prev_month:02d} to LATE_ENTRY_PERIOD (within grace period)")
    else:
        # Grace period has passed
        cursor.execute("""
            UPDATE ledger.cashflow_periods
            SET status = 'CLOSED', last_updated = CURRENT_TIMESTAMP
            WHERE year = %s AND month = %s
        """, (prev_year, prev_month))
        print(f"✅ Set {prev_year}-{prev_month:02d} to CLOSED (grace period ended)")
    
    # Set all future months to LOCKED
    cursor.execute("""
        UPDATE ledger.cashflow_periods
        SET status = 'LOCKED', last_updated = CURRENT_TIMESTAMP
        WHERE (year > %s OR (year = %s AND month > %s))
        AND status != 'LOCKED'
    """, (current_year, current_year, current_month))
    print(f"✅ Set all future months to LOCKED")
    
    # Set all past months (except previous if in grace period) to CLOSED
    cursor.execute("""
        UPDATE ledger.cashflow_periods
        SET status = 'CLOSED', last_updated = CURRENT_TIMESTAMP
        WHERE (year < %s OR (year = %s AND month < %s))
        AND status NOT IN ('CLOSED', 'LATE_ENTRY_PERIOD')
    """, (prev_year, prev_year, prev_month))
    
    conn.commit()
    print("\n✅ All periods updated successfully!")
    
    # Verify
    cursor.execute("""
        SELECT period_name, status
        FROM ledger.cashflow_periods
        WHERE year = %s AND month IN (%s, %s)
        ORDER BY month DESC
    """, (current_year, current_month, prev_month))
    
    print("\n📅 Recent periods:")
    for row in cursor.fetchall():
        print(f"   {row[0]}: {row[1]}")
    
except Exception as e:
    conn.rollback()
    print(f"❌ Error: {e}")
finally:
    cursor.close()
    conn.close()
