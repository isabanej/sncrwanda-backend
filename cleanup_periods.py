import requests

# Login
print("Logging in...")
token = requests.post('http://localhost:9092/auth/login', json={
    'username': 'emino',
    'password': '123456'
}).json()['token']

headers = {'Authorization': f'Bearer {token}'}
org_id = '550e8400-e29b-41d4-a716-446655440000'

# Get all periods
print("Fetching existing periods...")
periods = requests.get(f'http://localhost:8082/api/cashflow/periods?orgId={org_id}', headers=headers).json()
print(f"Found {len(periods)} periods to delete")

# Delete each period
for period in periods:
    response = requests.delete(f'http://localhost:8082/api/cashflow/periods/{period["id"]}', headers=headers)
    print(f"Deleted {period['periodName']}: {response.status_code}")

print("\nAll periods deleted. Ready for reimport.")
