import psycopg2
import sys

try:
    conn = psycopg2.connect(
        dbname="sncrwanda",
        user="postgres",
        password="postgres",
        host="localhost",
        port="5432"
    )
    
    cur = conn.cursor()
    org_id = "550e8400-e29b-41d4-a716-446655440000"
    
    # Check periods
    cur.execute("SELECT COUNT(*) FROM ledger.cashflow_periods WHERE org_id = %s", (org_id,))
    period_count = cur.fetchone()[0]
    print(f"✅ Periods: {period_count}")
    
    # Check student fees
    cur.execute("""
        SELECT COUNT(*) FROM ledger.student_fee_payments 
        WHERE period_id IN (SELECT id FROM ledger.cashflow_periods WHERE org_id = %s)
    """, (org_id,))
    fee_count = cur.fetchone()[0]
    print(f"✅ Student Fee Payments: {fee_count}")
    
    # Check expenses
    cur.execute("""
        SELECT COUNT(*) FROM ledger.cashflow_expenses 
        WHERE period_id IN (SELECT id FROM ledger.cashflow_periods WHERE org_id = %s)
    """, (org_id,))
    expense_count = cur.fetchone()[0]
    print(f"✅ Expenses: {expense_count}")
    
    # Check petty cash
    cur.execute("""
        SELECT COUNT(*) FROM ledger.petty_cash_transactions 
        WHERE period_id IN (SELECT id FROM ledger.cashflow_periods WHERE org_id = %s)
    """, (org_id,))
    petty_count = cur.fetchone()[0]
    print(f"✅ Petty Cash Transactions: {petty_count}")
    
    # Check one period details
    cur.execute("""
        SELECT p.month, p.year, 
               (SELECT COUNT(*) FROM ledger.student_fee_payments WHERE period_id = p.id) as fees,
               (SELECT COUNT(*) FROM ledger.cashflow_expenses WHERE period_id = p.id) as expenses
        FROM ledger.cashflow_periods p
        WHERE p.org_id = %s 
        ORDER BY p.year DESC, p.month DESC
        LIMIT 5
    """, (org_id,))
    
    print("\n📊 Sample Period Data:")
    for row in cur.fetchall():
        print(f"  {row[1]}-{row[0]:02d}: {row[2]} fees, {row[3]} expenses")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
