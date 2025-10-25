import psycopg2

conn = psycopg2.connect(host='localhost', port=5432, database='sncrwanda', user='postgres', password='postgres')
cur = conn.cursor()

print("FIXING DATABASE TO MATCH EXCEL")
print("=" * 70)

# Clear data
print("\n1. Clearing data...")
cur.execute("DELETE FROM student_fee_payments")
cur.execute("DELETE FROM cashflow_expenses")
cur.execute("DELETE FROM petty_cash_transactions")
cur.execute("DELETE FROM cashflow_periods")
conn.commit()
print("   OK")

# Create periods and get IDs
print("\n2. Creating periods...")
org_id = '550e8400-e29b-41d4-a716-446655440000'
user_id = '00000000-0000-0000-0000-000000000001'
period_ids = {}

for month, name in [(1,'Jan 2025'),(2,'Fab 2025'),(3,'Mar 2025'),(4,'Apr 2025'),
                    (5,'May 2025'),(6,'Jun 2025'),(7,'Jul 2025'),(8,'Aug 2025'),
                    (9,'Sept 2025'),(10,'Oct 2025'),(11,'Nov 2025'),(12,'Dec 2025')]:
    cur.execute("""
        INSERT INTO cashflow_periods (org_id, year, month, period_name, status, 
                                       beginning_cash, ending_cash, late_entry_deadline, 
                                       locked_date, created_at, last_updated)
        VALUES (%s, 2025, %s, %s, 'LOCKED', 0, 0, 
                ('2025-' || LPAD(%s::text, 2, '0') || '-28')::timestamp,
                NOW(), NOW(), NOW())
        RETURNING id
    """, (org_id, month, name, month))
    period_ids[month] = cur.fetchone()[0]

conn.commit()
print("   OK - 12 periods created")

# Set balances from Excel
print("\n3. Setting balances...")
balances = [
    (1,0,0),(2,0,0),(3,0,0),(4,0,0),(5,0,0),(6,0,0),(7,0,0),
    (8,10000000,9945000),(9,9945000,8529247),(10,8529247,7565259),
    (11,7565259,6765259),(12,6765259,6765259)
]
for month, beg, end in balances:
    cur.execute("UPDATE cashflow_periods SET beginning_cash=%s, ending_cash=%s WHERE month=%s AND year=2025",
                (beg, end, month))
conn.commit()
print("   OK")

# Add fees
print("\n4. Adding fees...")
cur.execute("""INSERT INTO student_fee_payments (period_id, student_id, student_name, fee_type, 
            amount_paid, payment_date, payment_method, receipt_number, recorded_by, recorded_at, org_id)
            VALUES (%s, gen_random_uuid(), 'Jed', 'SNC', 420000, '2025-09-30', 'Import', 'JED-SEPT', %s, NOW(), %s),
                   (%s, gen_random_uuid(), 'nael', 'SNC', 240000, '2025-09-30', 'Import', 'NAEL-SEPT', %s, NOW(), %s),
                   (%s, gen_random_uuid(), 'Gaju', 'Home Schooling', 600000, '2025-10-31', 'Import', 'GAJU-OCT', %s, NOW(), %s)
""", (period_ids[9], user_id, org_id, period_ids[9], user_id, org_id, period_ids[10], user_id, org_id))
conn.commit()
print("   OK - 3 students")

# Add expenses (simplified - just the main ones)
print("\n5. Adding expenses...")
expenses = [
    (8, 'Website', 55000),
    (9, 'Staff Wages', 1185000),
    (9, 'Rent', 800000),
    (9, 'Training', 150000),
    (10, 'Rent', 800000),
    (10, 'Staff Wages', 285000),
    (10, 'Equipment', 81500),
    (10, 'Food Costs', 220000),
    (10, 'Advertising', 13000),
    (10, 'Professional Services', 50000),
    (10, 'Office Supplies', 4500),
    (10, 'Website', 50000),
    (10, 'Repair', 50000),
    (10, 'Supplies', 25000),
    (10, 'therapists', 160000),
    (10, 'Business Phone', 5000),
    (10, 'Petty Cash OUT', 70000),
    (11, 'Rent', 800000),
    (12, 'Rent', 800000)
]
for month, desc, amt in expenses:
    cur.execute("""INSERT INTO cashflow_expenses (period_id, category, description, amount, 
                   transaction_date, payment_method, recorded_by, recorded_at, org_id)
                   VALUES (%s, 'Expense', %s, %s, ('2025-' || LPAD(%s::text,2,'0') || '-30')::date, 
                           'Import', %s, NOW(), %s)
""", (period_ids[month], desc, amt, month, user_id, org_id))
conn.commit()
print(f"   OK - {len(expenses)} expenses")

# Add petty cash
print("\n6. Adding petty cash...")
cur.execute("""INSERT INTO petty_cash_transactions (period_id, transaction_type, category, description, 
               amount, transaction_date, recorded_by, recorded_at, org_id)
               VALUES (%s, 'IN', 'Other', 'Other cash in', 59247, '2025-09-30', %s, NOW(), %s),
                      (%s, 'IN', 'Deposit', 'Petty cash in', 200012, '2025-10-31', %s, NOW(), %s),
                      (%s, 'OUT', 'Withdrawal', 'Petty cash out', 70000, '2025-11-30', %s, NOW(), %s)
""", (period_ids[9], user_id, org_id, period_ids[10], user_id, org_id, period_ids[11], user_id, org_id))
conn.commit()
print("   OK")

print("\n" + "=" * 70)
print("DONE! Refresh your dashboard.")
print("=" * 70)

cur.close()
conn.close()
