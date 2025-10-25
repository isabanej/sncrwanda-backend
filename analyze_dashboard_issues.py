import requests
import json

url = "http://localhost:9090/ledger/api/cashflow/periods/with-totals?orgId=550e8400-e29b-41d4-a716-446655440000"

response = requests.get(url)
periods = response.json()

print("Financial Data Analysis:")
print("=" * 100)
print(f"{'Period':15s} {'Beginning':>15s} {'Income':>15s} {'Expenses':>15s} {'Ending':>15s} {'Net Flow':>15s}")
print("=" * 100)

total_income = 0
total_expenses = 0
total_beginning = 0

for p in sorted(periods, key=lambda x: (x['year'], x['month'])):
    if p['month'] in [8, 9, 10, 11]:  # Focus on periods with data
        beginning = p['beginningCash']
        income = p['totalIncome'] or 0
        expenses = p['totalExpenses'] or 0
        ending = p['endingCash']
        net_flow = income - expenses
        
        total_income += income
        total_expenses += expenses
        if beginning > 0:
            total_beginning = beginning
        
        print(f"{p['periodName']:15s} {beginning:>15,.2f} {income:>15,.2f} {expenses:>15,.2f} {ending:>15,.2f} {net_flow:>15,.2f}")

print("=" * 100)
print(f"{'TOTALS':15s} {total_beginning:>15,.2f} {total_income:>15,.2f} {total_expenses:>15,.2f} {'':>15s} {total_income - total_expenses:>15,.2f}")
print()
print("ISSUES IDENTIFIED:")
print("1. Current Cash Balance = 0 because endingCash is not being calculated")
print("2. Net Cash Flow is negative because expenses exceed income")
print(f"3. Total Income = {total_income:,.2f} (only includes fees/income, not beginning balance)")
print(f"4. Beginning Balance = {total_beginning:,.2f} should be added to available cash, not income")
