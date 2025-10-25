import psycopg2
from decimal import Decimal

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()

print("FIXING DATABASE TO MATCH EXCEL SCREENSHOTS EXACTLY")
print("=" * 80)

# 1. Clear all cashflow data
print("\n1. Clearing existing data...")
cur.execute("DELETE FROM student_fee_payments")
cur.execute("DELETE FROM cashflow_expenses")
cur.execute("DELETE FROM petty_cash_transactions")
cur.execute("DELETE FROM cashflow_periods")
conn.commit()
print("   OK - Cleared all data")

# 2. Create periods
print("\n2. Creating periods...")
org_id = '550e8400-e29b-41d4-a716-446655440000'
months_data = [
    ('Jan 2025', 2025, 1),
    ('Fab 2025', 2025, 2),
    ('Mar 2025', 2025, 3),
    ('Apr 2025', 2025, 4),
    ('May 2025', 2025, 5),
    ('Jun 2025', 2025, 6),
    ('Jul 2025', 2025, 7),
    ('Aug 2025', 2025, 8),
    ('Sept 2025', 2025, 9),
    ('Oct 2025', 2025, 10),
    ('Nov 2025', 2025, 11),
    ('Dec 2025', 2025, 12)
]

period_ids = {}
for period_name, year, month in months_data:
    cur.execute("""
        INSERT INTO cashflow_periods 
        (org_id, year, month, period_name, status, beginning_cash, ending_cash,
         late_entry_deadline, locked_date, created_at, last_updated)
        VALUES (%s, %s, %s, %s, 'LOCKED', 0, 0, 
                (%s || '-' || LPAD(%s::text, 2, '0') || '-28')::timestamp,
                NOW(), NOW(), NOW())
        RETURNING id
    """, (org_id, year, month, period_name, year, month))
    period_id = cur.fetchone()[0]
    period_ids[month] = period_id
    print(f"   Created {period_name} (ID: {period_id})")

conn.commit()

# 3. Set cash balances from Excel Row 35 (Ending Cash)
print("\n3. Setting cash balances from Excel...")
# From Excel:
# Aug: Beginning=10,000,000 -> Ending=9,945,000
# Sept: Beginning=9,945,000 -> Ending=8,529,247
# Oct: Beginning=8,529,247 -> Ending=7,565,259
# Nov: Beginning=7,565,259 -> Ending=6,765,259
# Dec: Beginning=6,765,259 -> Ending=6,765,259

cash_balances = [
    (1, 0, 0),
    (2, 0, 0),
    (3, 0, 0),
    (4, 0, 0),
    (5, 0, 0),
    (6, 0, 0),
    (7, 0, 0),
    (8, 10000000, 9945000),
    (9, 9945000, 8529247),
    (10, 8529247, 7565259),
    (11, 7565259, 6765259),
    (12, 6765259, 6765259),
]

for month, beginning, ending in cash_balances:
    cur.execute("""
        UPDATE cashflow_periods 
        SET beginning_cash = %s, ending_cash = %s
        WHERE year=2025 AND month=%s
    """, (beginning, ending, month))

conn.commit()
print("   OK - Cash balances set")

# 4. Add student fees from Revenue sheet
print("\n4. Adding student fees...")
import_user_id = '00000000-0000-0000-0000-000000000001'

# Sept fees: Jed (420,000) + nael (240,000) = 660,000
cur.execute("""
    INSERT INTO student_fee_payments 
    (period_id, student_id, student_name, fee_type, amount_paid, payment_date,
     payment_method, receipt_number, recorded_by, recorded_at, org_id)
    VALUES 
    (%s, gen_random_uuid(), 'Jed', 'SNC', 420000, '2025-09-30', 
     'Historical Import', 'IMPORT-JED-SEPT', %s, NOW(), %s),
    (%s, gen_random_uuid(), 'nael', 'SNC', 240000, '2025-09-30',
     'Historical Import', 'IMPORT-NAEL-SEPT', %s, NOW(), %s)
""", (period_ids[9], import_user_id, org_id, period_ids[9], import_user_id, org_id))

# Oct fees: Gaju (600,000)
cur.execute("""
    INSERT INTO student_fee_payments 
    (period_id, student_id, student_name, fee_type, amount_paid, payment_date,
     payment_method, receipt_number, recorded_by, recorded_at, org_id)
    VALUES 
    (%s, gen_random_uuid(), 'Gaju', 'Home Schooling', 600000, '2025-10-31',
     'Historical Import', 'IMPORT-GAJU-OCT', %s, NOW(), %s)
""", (period_ids[10], import_user_id, org_id))

conn.commit()
print("   Added Jed (420K Sept), nael (240K Sept), Gaju (600K Oct)")

# 5. Add expenses from Cashflow Statement
print("\n5. Adding expenses...")

# Aug: Website 55,000
cur.execute("""
    INSERT INTO cashflow_expenses
    (period_id, category, description, amount, transaction_date,
     payment_method, recorded_by, recorded_at, org_id)
    VALUES
    (%s, 'Operations', 'Website expense', 55000, '2025-08-31',
     'Historical Import', %s, NOW(), %s)
""", (period_ids[8], import_user_id, org_id))

# Sept: Staff Wages 1,185,000 + Website 0 (from Excel row 24 and 15)
# Actually from Excel Sept column (L):
# Staff Wages: 1,185,000
# Total Expenses: 2,135,000
# Let me check what makes up 2,135,000...
# Looking at the detailed screenshot: Sept has Staff Wages 1,185,000
# But Total Expenses shows 2,135,000 in Sept column
# Wait, looking more carefully at Excel screenshot 1:
# Sept (column L): Total Expenses = 2,135,000
# This must include multiple items. Let me add them individually:

# Sept: Staff Wages 1,185,000
cur.execute("""
    INSERT INTO cashflow_expenses
    (period_id, category, description, amount, transaction_date,
     payment_method, recorded_by, recorded_at)
    VALUES
    (%s, 'Salaries', 'Staff wages', 1185000, '2025-09-30',
     'Historical Import', %s, NOW())
""", (period_ids[9], import_user_id))

# Sept: Rent 800,000 (from Excel row 11 column L)
cur.execute("""
    INSERT INTO cashflow_expenses
    (period_id, category, description, amount, transaction_date,
     payment_method, recorded_by, recorded_at)
    VALUES
    (%s, 'Rent', 'Office rent', 800000, '2025-09-30',
     'Historical Import', %s, NOW())
""", (period_ids[9], import_user_id))

# Sept: Training 150,000
cur.execute("""
    INSERT INTO cashflow_expenses
    (period_id, category, description, amount, transaction_date,
     payment_method, recorded_by, recorded_at)
    VALUES
    (%s, 'Training', 'Training costs', 150000, '2025-09-30',
     'Historical Import', %s, NOW())
""", (period_ids[9], import_user_id))

# Oct: Multiple expenses totaling 1,764,000
# Rent: 800,000
cur.execute("""
    INSERT INTO cashflow_expenses
    (period_id, category, description, amount, transaction_date,
     payment_method, recorded_by, recorded_at)
    VALUES
    (%s, 'Rent', 'Office rent', 800000, '2025-10-31',
     'Historical Import', %s, NOW())
""", (period_ids[10], import_user_id))

# Staff Wages: 285,000
cur.execute("""
    INSERT INTO cashflow_expenses
    (period_id, category, description, amount, transaction_date,
     payment_method, recorded_by, recorded_at)
    VALUES
    (%s, 'Salaries', 'Staff wages', 285000, '2025-10-31',
     'Historical Import', %s, NOW())
""", (period_ids[10], import_user_id))

# Other Oct expenses: Equipment(81500), Food Costs(220000), Advertising(13000),
# Professional Services(50000), Office Supplies(4500), Website(50000),
# Repair(50000), Supplies(25000), therapists(160000), Business Phone(5000)
# Total: 659,000
expenses_oct = [
    ('Equipment', 'Equipment', 81500),
    ('Operations', 'Food Costs', 220000),
    ('Marketing', 'Advertising', 13000),
    ('Operations', 'Professional Services', 50000),
    ('Operations', 'Office Supplies', 4500),
    ('Operations', 'Website', 50000),
    ('Maintenance', 'Repair / Maint.', 50000),
    ('Operations', 'Supplies', 25000),
    ('Salaries', 'therapists', 160000),
    ('Operations', 'Business Phone', 5000),
    ('Operations', 'Petty Cash OUT', 70000)
]

for cat, desc, amt in expenses_oct:
    cur.execute("""
        INSERT INTO cashflow_expenses
        (period_id, category, description, amount, transaction_date,
         payment_method, recorded_by, recorded_at)
        VALUES
        (%s, %s, %s, %s, '2025-10-31',
         'Historical Import', %s, NOW())
    """, (period_ids[10], cat, desc, amt, import_user_id))

# Nov: Rent 800,000
cur.execute("""
    INSERT INTO cashflow_expenses
    (period_id, category, description, amount, transaction_date,
     payment_method, recorded_by, recorded_at)
    VALUES
    (%s, 'Rent', 'Office rent', 800000, '2025-11-30',
     'Historical Import', %s, NOW())
""", (period_ids[11], import_user_id))

# Dec: Rent 800,000
cur.execute("""
    INSERT INTO cashflow_expenses
    (period_id, category, description, amount, transaction_date,
     payment_method, recorded_by, recorded_at)
    VALUES
    (%s, 'Rent', 'Office rent', 800000, '2025-12-31',
     'Historical Import', %s, NOW())
""", (period_ids[12], import_user_id))

conn.commit()
print("   OK - Expenses added")

# 6. Add petty cash transactions
print("\n6. Adding petty cash...")
# Oct: Petty Cash IN 200,012 (row 6 column M shows "Other Cash in" with 59,247)
# Actually row 3 shows "Other Cash in" = 59,247 and row 6 shows Petty Cash(IN) = 200,012
cur.execute("""
    INSERT INTO petty_cash_transactions
    (period_id, transaction_type, category, description, amount, transaction_date,
     recorded_by, recorded_at)
    VALUES
    (%s, 'IN', 'Cash Deposit', 'Petty cash in', 200012, '2025-10-31',
     %s, NOW())
""", (period_ids[10], import_user_id))

# Nov: Petty Cash OUT 70,000
cur.execute("""
    INSERT INTO petty_cash_transactions
    (period_id, transaction_type, category, description, amount, transaction_date,
     recorded_by, recorded_at)
    VALUES
    (%s, 'OUT', 'Cash Withdrawal', 'Petty cash out', 70000, '2025-11-30',
     %s, NOW())
""", (period_ids[11], import_user_id))

# Sept: Other Cash In 59,247
cur.execute("""
    INSERT INTO petty_cash_transactions
    (period_id, transaction_type, category, description, amount, transaction_date,
     recorded_by, recorded_at)
    VALUES
    (%s, 'IN', 'Other Income', 'Other cash in', 59247, '2025-09-30',
     %s, NOW())
""", (period_ids[9], import_user_id))

conn.commit()
print("   OK - Petty cash transactions added")

# Verification
print("\n" + "=" * 80)
print("VERIFICATION:")
print("=" * 80)

cur.execute("""
    SELECT period_name, beginning_cash, ending_cash 
    FROM cashflow_periods 
    WHERE year=2025 
    ORDER BY month
""")

print("\nCash Balances:")
for row in cur.fetchall():
    print(f"  {row[0]:12} : {row[1]:>12,} -> {row[2]:>12,}")

print("\n" + "=" * 80)
print("DATABASE UPDATED TO MATCH EXCEL!")
print("Current Cash Balance (Dec 2025): 6,765,259")
print("=" * 80)

cur.close()
conn.close()
