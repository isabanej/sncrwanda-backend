import psycopg2

c=psycopg2.connect(host='localhost',database='sncrwanda',user='postgres',password='postgres')
r=c.cursor()
r.execute("SELECT column_name FROM information_schema.columns WHERE table_name='cashflow_periods' ORDER BY ordinal_position")
print("cashflow_periods columns:")
for x in r.fetchall():
    print(f"  - {x[0]}")

r.execute("SELECT column_name FROM information_schema.columns WHERE table_name='student_fee_payments' ORDER BY ordinal_position")
print("\nstudent_fee_payments columns:")
for x in r.fetchall():
    print(f"  - {x[0]}")

r.execute("SELECT column_name FROM information_schema.columns WHERE table_name='cashflow_expenses' ORDER BY ordinal_position")  
print("\ncashflow_expenses columns:")
for x in r.fetchall():
    print(f"  - {x[0]}")

c.close()
