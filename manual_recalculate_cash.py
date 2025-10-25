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

org_id = '550e8400-e29b-41d4-a716-446655440000'

print("Manual Recalculation of Ending Cash:")
print("=" * 100)

# Get all periods sorted by date
cur.execute("""
    SELECT id, period_name, year, month, beginning_cash
    FROM ledger.cashflow_periods
    WHERE org_id = %s
    ORDER BY year, month
""", (org_id,))

periods = cur.fetchall()

for i, period in enumerate(periods):
    period_id, period_name, year, month, beginning_cash = period
    
    # Get student fees
    cur.execute("""
        SELECT COALESCE(SUM(amount_paid), 0)
        FROM ledger.student_fee_payments
        WHERE period_id = %s
    """, (period_id,))
    fees = cur.fetchone()[0] or Decimal('0')
    
    # Get expenses
    cur.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM ledger.cashflow_expenses
        WHERE period_id = %s
    """, (period_id,))
    expenses = cur.fetchone()[0] or Decimal('0')
    
    # Get petty cash IN
    cur.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM ledger.petty_cash_transactions
        WHERE period_id = %s AND transaction_type = 'IN'
    """, (period_id,))
    petty_in = cur.fetchone()[0] or Decimal('0')
    
    # Get petty cash OUT
    cur.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM ledger.petty_cash_transactions
        WHERE period_id = %s AND transaction_type = 'OUT'
    """, (period_id,))
    petty_out = cur.fetchone()[0] or Decimal('0')
    
    # Calculate ending cash
    ending_cash = beginning_cash + fees + petty_in - expenses - petty_out
    
    # Update the period
    cur.execute("""
        UPDATE ledger.cashflow_periods
        SET ending_cash = %s
        WHERE id = %s
    """, (ending_cash, period_id))
    
    # Update next period's beginning cash
    if i < len(periods) - 1:
        next_period_id = periods[i + 1][0]
        cur.execute("""
            UPDATE ledger.cashflow_periods
            SET beginning_cash = %s
            WHERE id = %s
        """, (ending_cash, next_period_id))
    
    print(f"{period_name:15s} | Begin: {beginning_cash:>12,.2f} | Fees: {fees:>10,.2f} | Exp: {expenses:>10,.2f} | Petty Net: {petty_in - petty_out:>10,.2f} | End: {ending_cash:>12,.2f}")

conn.commit()
print("\n✅ All periods recalculated and updated!")

# Verify final state
print("\n" + "=" * 100)
print("Final Verification:")
print("=" * 100)

cur.execute("""
    SELECT period_name, beginning_cash, ending_cash
    FROM ledger.cashflow_periods
    WHERE org_id = %s AND month IN (8, 9, 10, 11, 12)
    ORDER BY year, month
""", (org_id,))

print(f"{'Period':15s} {'Beginning':>15s} {'Ending':>15s}")
print("=" * 50)
for row in cur.fetchall():
    print(f"{row[0]:15s} {row[1]:>15,.2f} {row[2]:>15,.2f}")

cur.close()
conn.close()
