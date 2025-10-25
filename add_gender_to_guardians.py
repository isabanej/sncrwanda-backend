import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/sncrwanda')
cursor = conn.cursor()

try:
    print("🔧 Adding gender column to guardians table...")
    cursor.execute("""
        ALTER TABLE students.guardians
        ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
    """)
    
    print("✅ Adding check constraint for guardians...")
    cursor.execute("""
        ALTER TABLE students.guardians
        DROP CONSTRAINT IF EXISTS guardians_gender_check
    """)
    cursor.execute("""
        ALTER TABLE students.guardians
        ADD CONSTRAINT guardians_gender_check 
        CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE'))
    """)
    
    conn.commit()
    print("\n✅ Migration completed successfully!")
    print("   Gender field added to guardians table")
    
    # Verify
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'students' 
        AND table_name = 'guardians' 
        AND column_name = 'gender'
    """)
    result = cursor.fetchone()
    
    if result:
        print(f"\n📊 Verification:")
        print(f"   ✅ Guardians table: gender column exists ({result[1]})")
    
except Exception as e:
    conn.rollback()
    print(f"❌ Error running migration: {e}")
finally:
    cursor.close()
    conn.close()
