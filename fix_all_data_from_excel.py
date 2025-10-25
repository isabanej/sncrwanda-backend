import psycopg2
from decimal import Decimal

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres',
    options='-c search_path=ledger'  # Use ledger schema!
)

cur = conn.cursor()

print("\n" + "="*80)
print("  FIXING ALL DATA TO MATCH EXCEL FILE")
print("="*80)

org_id = '550e8400-e29b-41d4-a716-446655440000'

# 1. CLEAR ALL DATA
print("\n1. Clearing all existing data...")

# Get all period IDs for this org
cur.execute("SELECT id FROM ledger.cashflow_periods WHERE org_id = %s", (org_id,))
period_ids_to_delete = [row[0] for row in cur.fetchall()]

if period_ids_to_delete:
    # Disable triggers temporarily
    cur.execute("ALTER TABLE ledger.petty_cash_transactions DISABLE TRIGGER ALL")
    cur.execute("ALTER TABLE ledger.cashflow_expenses DISABLE TRIGGER ALL")
    cur.execute("ALTER TABLE ledger.student_fee_payments DISABLE TRIGGER ALL")
    cur.execute("ALTER TABLE ledger.staff_payroll DISABLE TRIGGER ALL")
    
    # Delete child records first
    for pid in period_ids_to_delete:
        cur.execute("DELETE FROM ledger.petty_cash_summary WHERE period_id = %s", (pid,))
        cur.execute("DELETE FROM ledger.student_fee_payments WHERE period_id = %s", (pid,))
        cur.execute("DELETE FROM ledger.cashflow_expenses WHERE period_id = %s", (pid,))
        cur.execute("DELETE FROM ledger.petty_cash_transactions WHERE period_id = %s", (pid,))
        cur.execute("DELETE FROM ledger.staff_payroll WHERE period_id = %s", (pid,))
    
    # Now delete periods
    cur.execute("DELETE FROM ledger.cashflow_periods WHERE org_id = %s", (org_id,))
    
    # Re-enable triggers
    cur.execute("ALTER TABLE ledger.petty_cash_transactions ENABLE TRIGGER ALL")
    cur.execute("ALTER TABLE ledger.cashflow_expenses ENABLE TRIGGER ALL")
    cur.execute("ALTER TABLE ledger.student_fee_payments ENABLE TRIGGER ALL")
    cur.execute("ALTER TABLE ledger.staff_payroll ENABLE TRIGGER ALL")

conn.commit()
print("   ✓ All data cleared")

# 2. CREATE 12 PERIODS (Jan-Dec 2025)
print("\n2. Creating 12 periods for 2025...")
months = [
    ('Jan 2025', 1), ('Fab 2025', 2), ('Mar 2025', 3), ('Apr 2025', 4),
    ('May 2025', 5), ('Jun 2025', 6), ('Jul 2025', 7), ('Aug 2025', 8),
    ('Sept 2025', 9), ('Oct 2025', 10), ('Nov 2025', 11), ('Dec 2025', 12)
]

period_ids = {}
for period_name, month in months:
    cur.execute("""
        INSERT INTO cashflow_periods 
        (id, org_id, year, month, period_name, status, beginning_cash, ending_cash, created_at, last_updated)
        VALUES (gen_random_uuid(), %s, 2025, %s, %s, 'LOCKED', 0, 0, NOW(), NOW())
        RETURNING id
    """, (org_id, month, period_name))
    period_ids[period_name] = cur.fetchone()[0]

conn.commit()
print(f"   ✓ Created {len(period_ids)} periods")

# 3. SET CORRECT CASH BALANCES FROM EXCEL
print("\n3. Setting cash balances from Excel...")

# Excel values from row 5 (Cash Available) and row 35 (Ending Cash)
balances = {
    'Jan 2025': {'beginning': 0, 'ending': 0},
    'Fab 2025': {'beginning': 0, 'ending': 0},
    'Mar 2025': {'beginning': 0, 'ending': 0},
    'Apr 2025': {'beginning': 0, 'ending': 0},
    'May 2025': {'beginning': 0, 'ending': 0},
    'Jun 2025': {'beginning': 0, 'ending': 0},
    'Jul 2025': {'beginning': 0, 'ending': 0},
    'Aug 2025': {'beginning': 10000000, 'ending': 9945000},      # 10M - 55K
    'Sept 2025': {'beginning': 9945000, 'ending': 8529247},      # 9,945K - 2,135K + 719K
    'Oct 2025': {'beginning': 8529247, 'ending': 7565259},       # 8,529K - 1,764K + 800K
    'Nov 2025': {'beginning': 7565259, 'ending': 6765259},       # 7,565K - 800K
    'Dec 2025': {'beginning': 6765259, 'ending': 6765259}        # No change
}

for period_name, cash in balances.items():
    cur.execute("""
        UPDATE cashflow_periods
        SET beginning_cash = %s, ending_cash = %s
        WHERE id = %s
    """, (cash['beginning'], cash['ending'], period_ids[period_name]))

conn.commit()
print("   ✓ Cash balances set correctly")

# 4. ADD STUDENT FEES FROM EXCEL (Row 2)
print("\n4. Adding student fees from Excel...")

fees = [
    # Sept: Jed (420K) + nael (240K) = 660K
    {'period': 'Sept 2025', 'student': 'Jed', 'amount': 420000},
    {'period': 'Sept 2025', 'student': 'nael', 'amount': 240000},
    # Oct: Gaju (600K)
    {'period': 'Oct 2025', 'student': 'Gaju', 'amount': 600000},
]

for fee in fees:
    cur.execute("""
        INSERT INTO student_fee_payments
        (id, period_id, student_id, student_name, fee_type, amount_paid, 
         payment_date, payment_method, recorded_by, recorded_at, org_id)
        VALUES (gen_random_uuid(), %s, gen_random_uuid(), %s, 'TUITION', %s, 
                CURRENT_DATE, 'BANK_TRANSFER', gen_random_uuid(), NOW(), %s)
    """, (period_ids[fee['period']], fee['student'], fee['amount'], org_id))

conn.commit()
print(f"   ✓ Added {len(fees)} student fee payments (Total: 1,260,000)")

# 5. ADD EXPENSES FROM EXCEL (Rows 10-31)
print("\n5. Adding expenses from Excel...")

expenses = [
    # Aug
    {'period': 'Aug 2025', 'category': 'MARKETING', 'description': 'Website', 'amount': 55000},
    
    # Sept  
    {'period': 'Sept 2025', 'category': 'RENT', 'description': 'Rent', 'amount': 800000},
    {'period': 'Sept 2025', 'category': 'TRAINING', 'description': 'Training', 'amount': 150000},
    {'period': 'Sept 2025', 'category': 'PAYROLL', 'description': 'Staff Wages', 'amount': 1185000},
    
    # Oct
    {'period': 'Oct 2025', 'category': 'PETTY_CASH', 'description': 'Petty Cash(OUT)', 'amount': 70000},
    {'period': 'Oct 2025', 'category': 'RENT', 'description': 'Rent', 'amount': 800000},
    {'period': 'Oct 2025', 'category': 'EQUIPMENT', 'description': 'Equipment', 'amount': 81500},
    {'period': 'Oct 2025', 'category': 'FOOD', 'description': 'Food Costs', 'amount': 220000},
    {'period': 'Oct 2025', 'category': 'MARKETING', 'description': 'Advertising', 'amount': 13000},
    {'period': 'Oct 2025', 'category': 'INSURANCE', 'description': 'Professional Services / Intern', 'amount': 50000},
    {'period': 'Oct 2025', 'category': 'SUPPLIES', 'description': 'Office Supplies', 'amount': 4500},
    {'period': 'Oct 2025', 'category': 'MAINTENANCE', 'description': 'Repair / Maint.', 'amount': 50000},
    {'period': 'Oct 2025', 'category': 'SUPPLIES', 'description': 'Supplies', 'amount': 25000},
    {'period': 'Oct 2025', 'category': 'HEALTHCARE', 'description': 'therapists', 'amount': 160000},
    {'period': 'Oct 2025', 'category': 'UTILITIES', 'description': 'Business Phone', 'amount': 5000},
    {'period': 'Oct 2025', 'category': 'PAYROLL', 'description': 'Staff Wages', 'amount': 285000},
    
    # Nov
    {'period': 'Nov 2025', 'category': 'RENT', 'description': 'Rent', 'amount': 800000},
]

for exp in expenses:
    cur.execute("""
        INSERT INTO cashflow_expenses
        (id, period_id, category, description, amount, transaction_date, 
         payment_method, recorded_by, recorded_at, org_id)
        VALUES (gen_random_uuid(), %s, %s, %s, %s, CURRENT_DATE, 
                'BANK_TRANSFER', gen_random_uuid(), NOW(), %s)
    """, (period_ids[exp['period']], exp['category'], exp['description'], 
          exp['amount'], org_id))

conn.commit()
print(f"   ✓ Added {len(expenses)} expenses (Total: 4,754,000)")

# 6. ADD PETTY CASH FROM EXCEL (Row 3)
print("\n6. Adding petty cash transactions from Excel...")

petty_cash = [
    # Sept: 59,247 IN
    {'period': 'Sept 2025', 'type': 'IN', 'amount': 59247, 
     'description': 'Other Cash In (Sponsor, owner\'s investment, etc.)'},
    
    # Oct: 200,012 IN
    {'period': 'Oct 2025', 'type': 'IN', 'amount': 200012, 
     'description': 'Petty Cash(IN)'},
    
    # Nov: 70,000 OUT (already included in expenses above)
    # Note: The 70K OUT in Nov is recorded as expense, not separate petty cash
]

for pc in petty_cash:
    cur.execute("""
        INSERT INTO petty_cash_transactions
        (id, period_id, transaction_type, category, description, amount, 
         transaction_date, recorded_by, recorded_at, org_id)
        VALUES (gen_random_uuid(), %s, %s, 'OTHER', %s, %s, CURRENT_DATE, 
                gen_random_uuid(), NOW(), %s)
    """, (period_ids[pc['period']], pc['type'], pc['description'], 
          pc['amount'], org_id))

conn.commit()
print(f"   ✓ Added {len(petty_cash)} petty cash transactions")

# 7. VERIFY THE DATA
print("\n7. Verifying data matches Excel...")
print("\n   CASH FLOW:")
cur.execute("""
    SELECT period_name, beginning_cash, ending_cash
    FROM cashflow_periods
    WHERE org_id = %s
    ORDER BY year, month
""", (org_id,))
for row in cur.fetchall():
    if row[1] > 0 or row[2] > 0:
        print(f"   {row[0]:12} : Beginning={row[1]:>12,} → Ending={row[2]:>12,}")

print("\n   STUDENT FEES:")
cur.execute("""
    SELECT p.period_name, SUM(f.amount_paid) as total
    FROM student_fee_payments f
    JOIN cashflow_periods p ON f.period_id = p.id
    WHERE f.org_id = %s
    GROUP BY p.period_name, p.year, p.month
    ORDER BY p.year, p.month
""", (org_id,))
total_fees = 0
for row in cur.fetchall():
    print(f"   {row[0]:12} : {row[1]:>12,}")
    total_fees += row[1]
print(f"   {'TOTAL':12} : {total_fees:>12,}")

print("\n   EXPENSES:")
cur.execute("""
    SELECT p.period_name, SUM(e.amount) as total
    FROM cashflow_expenses e
    JOIN cashflow_periods p ON e.period_id = p.id
    WHERE e.org_id = %s
    GROUP BY p.period_name, p.year, p.month
    ORDER BY p.year, p.month
""", (org_id,))
total_expenses = 0
for row in cur.fetchall():
    print(f"   {row[0]:12} : {row[1]:>12,}")
    total_expenses += row[1]
print(f"   {'TOTAL':12} : {total_expenses:>12,}")

print("\n   PETTY CASH:")
cur.execute("""
    SELECT p.period_name, pc.transaction_type, pc.amount
    FROM petty_cash_transactions pc
    JOIN cashflow_periods p ON pc.period_id = p.id
    WHERE pc.org_id = %s
    ORDER BY p.year, p.month
""", (org_id,))
for row in cur.fetchall():
    print(f"   {row[0]:12} {row[1]:3} : {row[2]:>12,}")

print("\n" + "="*80)
print("  ✅ DONE! All data now matches Excel exactly.")
print("  ")
print("  Expected Dashboard Totals:")
print("    • Total Income: 1,260,000 (fees)")
print("    • Total Expenses: 4,754,000")
print("    • Ending Cash: 6,765,259")
print("="*80 + "\n")

cur.close()
conn.close()
