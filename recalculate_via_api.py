import requests

print("=" * 80)
print("  RECALCULATING CASHFLOW BALANCES")
print("=" * 80)

# Get all periods
url = "http://localhost:9091/api/cashflow/periods"
response = requests.get(url)

if response.status_code != 200:
    print(f"❌ Error fetching periods: {response.status_code}")
    print(response.text)
    exit(1)

periods = response.json()
print(f"\n✅ Found {len(periods)} periods")

# Recalculate each period
for period in periods:
    period_id = period['id']
    month_year = period['monthYear']
    
    print(f"\n📊 Recalculating {month_year}...")
    
    # Get transactions for this period
    fees_response = requests.get(f"http://localhost:9091/api/cashflow/periods/{period_id}/fees")
    expenses_response = requests.get(f"http://localhost:9091/api/cashflow/periods/{period_id}/expenses")
    petty_cash_response = requests.get(f"http://localhost:9091/api/cashflow/periods/{period_id}/petty-cash")
    
    if fees_response.status_code != 200:
        print(f"  ⚠️  Error fetching fees: {fees_response.status_code}")
        continue
    
    if expenses_response.status_code != 200:
        print(f"  ⚠️  Error fetching expenses: {expenses_response.status_code}")
        continue
    
    if petty_cash_response.status_code != 200:
        print(f"  ⚠️  Error fetching petty cash: {petty_cash_response.status_code}")
        continue
    
    fees = fees_response.json()
    expenses = expenses_response.json()
    petty_cash = petty_cash_response.json()
    
    # Calculate totals
    total_fees = sum(fee['amount'] for fee in fees)
    total_expenses = sum(exp['amount'] for exp in expenses)
    
    total_petty_in = sum(pc['amount'] for pc in petty_cash if pc['transactionType'] == 'IN')
    total_petty_out = sum(pc['amount'] for pc in petty_cash if pc['transactionType'] == 'OUT')
    
    beginning_cash = period['beginningCash']
    ending_cash = beginning_cash + total_fees + total_petty_in - total_expenses - total_petty_out
    
    print(f"  Beginning: ${beginning_cash:,.2f}")
    print(f"  + Fees: ${total_fees:,.2f}")
    print(f"  + Petty Cash IN: ${total_petty_in:,.2f}")
    print(f"  - Expenses: ${total_expenses:,.2f}")
    print(f"  - Petty Cash OUT: ${total_petty_out:,.2f}")
    print(f"  = Ending: ${ending_cash:,.2f}")
    
    # Update period with new ending cash
    update_url = f"http://localhost:9091/api/cashflow/periods/{period_id}"
    update_data = {
        "endingCash": ending_cash
    }
    
    update_response = requests.patch(update_url, json=update_data)
    
    if update_response.status_code == 200:
        print(f"  ✅ Updated ending cash")
    else:
        print(f"  ❌ Error updating: {update_response.status_code}")
        print(f"     {update_response.text}")

print("\n" + "=" * 80)
print("  ✅ RECALCULATION COMPLETE!")
print("=" * 80)
