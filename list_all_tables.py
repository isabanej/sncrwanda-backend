import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/sncrwanda')
cursor = conn.cursor()

cursor.execute("""
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_type='BASE TABLE' 
    AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
""")

for schema, table in cursor.fetchall():
    print(f"{schema}.{table}")

cursor.close()
conn.close()
