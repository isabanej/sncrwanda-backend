import psycopg2
from datetime import datetime

try:
    conn = psycopg2.connect(
        host="localhost",
        database="sncrwanda",
        user="postgres",
        password="postgres",
        port=5432
    )
    
    cur = conn.cursor()
    
    # Get recent student fee payments
    cur.execute("""
        SELECT 
            id, 
            student_name, 
            amount_paid, 
            payment_date, 
            payment_method, 
            fee_type,
            payment_date as sort_date
        FROM ledger.student_fee_payments 
        ORDER BY payment_date DESC 
        LIMIT 10
    """)
    
    payments = cur.fetchall()
    
    print("\n" + "="*100)
    print("STUDENT FEE PAYMENTS IN DATABASE")
    print("="*100)
    
    if payments:
        print(f"\nFound {len(payments)} payment(s):\n")
        for i, payment in enumerate(payments, 1):
            print(f"{i}. Student: {payment[1]}")
            print(f"   Amount: {payment[2]:,.2f} RWF")
            print(f"   Payment Date: {payment[3]}")
            print(f"   Method: {payment[4]}")
            print(f"   Fee Type: {payment[5]}")
            print(f"   Created: {payment[6]}")
            print(f"   ID: {payment[0]}")
            print()
    else:
        print("\n⚠️  No payments found in database!")
    
    # Get total count
    cur.execute("SELECT COUNT(*) FROM ledger.student_fee_payments")
    total = cur.fetchone()[0]
    print(f"Total payments in database: {total}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"\n❌ Error: {e}")
