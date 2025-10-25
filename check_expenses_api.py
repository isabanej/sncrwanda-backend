import requests
import json

url = 'http://localhost:8082/api/cashflow/periods'
response = requests.get(url)
if response.status_code == 200:
    periods = response.json()
    print(f'Found {len(periods)} periods')
    if periods:
        period_id = periods[0]['id']
        print(f'Checking period {periods[0]["monthYear"]}')
        expenses_url = f'http://localhost:8082/api/cashflow/periods/{period_id}/expenses'
        expenses_response = requests.get(expenses_url)
        if expenses_response.status_code == 200:
            expenses = expenses_response.json()
            print(f'Found {len(expenses)} expenses')
            for exp in expenses[:5]:
                print(f'  - {exp["category"]}: ')
        else:
            print(f'Error: {expenses_response.status_code}')
