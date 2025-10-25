import psycopg2
from datetime import datetime

# Database connection
conn = psycopg2.connect(
    dbname="sncrwanda",
    user="postgres",
    password="postgres",
    host="localhost",
    port="5432"
)

cursor = conn.cursor()

# Get all periods with their status
cursor.execute("""
    SELECT period_name, year, month, status, 
           TO_CHAR(late_entry_deadline, 'YYYY-MM-DD HH24:MI') as deadline
    FROM ledger.cashflow_periods
    ORDER BY year DESC, month DESC
""")

print("📅 All Cashflow Periods Status:\n")
print(f"{'Period':<15} {'Year':<6} {'Month':<6} {'Status':<20} {'Late Entry Deadline':<20}")
print("=" * 85)

current_month = datetime.now().month
current_year = datetime.now().year

for row in cursor.fetchall():
    period_name, year, month, status, deadline = row
    marker = "👉" if (year == current_year and month == current_month) else "  "
    print(f"{marker} {period_name:<13} {year:<6} {month:<6} {status:<20} {deadline or 'N/A':<20}")

print("\n" + "=" * 85)

# Get summary
cursor.execute("""
    SELECT status, COUNT(*) 
    FROM ledger.cashflow_periods 
    GROUP BY status 
    ORDER BY status
""")

print("\n📊 Status Summary:")
for row in cursor.fetchall():
    print(f"   {row[0]}: {row[1]}")

cursor.close()
conn.close()
