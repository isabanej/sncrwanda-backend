import psycopg2

# Database connection
conn = psycopg2.connect(
    dbname="sncrwanda",
    user="postgres",
    password="postgres",
    host="localhost",
    port="5432"
)

cursor = conn.cursor()

try:
    print("🔧 Adding gender column to students table...")
    cursor.execute("""
        ALTER TABLE students.students
        ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
    """)
    
    print("🔧 Adding gender column to employees table...")
    cursor.execute("""
        ALTER TABLE hr.employees
        ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
    """)
    
    print("✅ Adding check constraint for students...")
    cursor.execute("""
        ALTER TABLE students.students
        DROP CONSTRAINT IF EXISTS students_gender_check
    """)
    cursor.execute("""
        ALTER TABLE students.students
        ADD CONSTRAINT students_gender_check 
        CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE'))
    """)
    
    print("✅ Adding check constraint for employees...")
    cursor.execute("""
        ALTER TABLE hr.employees
        DROP CONSTRAINT IF EXISTS employees_gender_check
    """)
    cursor.execute("""
        ALTER TABLE hr.employees
        ADD CONSTRAINT employees_gender_check 
        CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE'))
    """)
    
    conn.commit()
    print("\n✅ Migration completed successfully!")
    print("   Gender field added to both students and employees")
    
    # Verify
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'students' 
        AND table_name = 'students' 
        AND column_name = 'gender'
    """)
    student_result = cursor.fetchone()
    
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'hr' 
        AND table_name = 'employees' 
        AND column_name = 'gender'
    """)
    employee_result = cursor.fetchone()
    
    print("\n📊 Verification:")
    if student_result:
        print(f"   ✅ Students table: gender column exists ({student_result[1]})")
    else:
        print("   ❌ Students table: gender column NOT found")
        
    if employee_result:
        print(f"   ✅ Employees table: gender column exists ({employee_result[1]})")
    else:
        print("   ❌ Employees table: gender column NOT found")
    
except Exception as e:
    conn.rollback()
    print(f"❌ Error running migration: {e}")
finally:
    cursor.close()
    conn.close()
