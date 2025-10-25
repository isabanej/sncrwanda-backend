import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='sncrwanda',
    user='postgres',
    password='postgres'
)

cur = conn.cursor()
cur.execute('SELECT username, password_hash FROM auth.users WHERE username = %s', ('emino',))
row = cur.fetchone()

if row:
    print(f'\nUser: {row[0]}')
    print(f'Password hash: {row[1][:60]}...')
    print(f'Hash format: {"bcrypt" if row[1].startswith("$2") else "unknown"}')
else:
    print('User not found')

conn.close()
