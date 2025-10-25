import psycopg2

# First check what databases exist
conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='postgres',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()
cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")
databases = cur.fetchall()
print('\nAvailable Databases:')
for db in databases:
    print(f'  - {db[0]}')
conn.close()

# Try to connect to sncrwanda database
print('\n\nTrying to connect to sncrwanda database...')
try:
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='sncrwanda',
        user='postgres',
        password='postgres'
    )
    
    cur = conn.cursor()
    
    # Check schemas
    cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') ORDER BY schema_name")
    schemas = cur.fetchall()
    print('\nSchemas in sncrwanda database:')
    for s in schemas:
        print(f'  - {s[0]}')
    
    # Check for users table in auth schema
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth' ORDER BY table_name")
    tables = cur.fetchall()
    print('\nTables in auth schema:')
    for t in tables:
        print(f'  - {t[0]}')
    
    # If users table exists, check users
    if any(t[0] == 'users' for t in tables):
        cur.execute('SELECT username, email, role FROM auth.users ORDER BY username LIMIT 10')
        rows = cur.fetchall()
        print('\nExisting Users:')
        print(f'{"Username":<15} {"Email":<30} {"Role":<15}')
        print('-' * 60)
        for r in rows:
            print(f'{r[0]:<15} {r[1]:<30} {r[2]:<15}')
    
    conn.close()
except Exception as e:
    print(f'Error: {e}')
