import requests
from decimal import Decimal

# Configuration
LEDGER_URL = "http://localhost:8082"

def login():
    """Login and get access token"""
    response = requests.post(
        "http://localhost:9092/api/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        raise Exception(f"Login failed: {response.text}")

def get_periods(token):
    """Get all cashflow periods"""
    response = requests.get(
        f"{LEDGER_URL}/api/cashflow/periods",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get periods: {response.text}")

def get_period_details(period_id, token):
    """Get detailed info for a period including fees, expenses, petty cash"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get fees
    fees_response = requests.get(
        f"{LEDGER_URL}/api/cashflow/periods/{period_id}/fees",
        headers=headers
    )
    fees = fees_response.json() if fees_response.status_code == 200 else []
    
    # Get expenses
    expenses_response = requests.get(
        f"{LEDGER_URL}/api/cashflow/periods/{period_id}/expenses",
        headers=headers
    )
    expenses = expenses_response.json() if expenses_response.status_code == 200 else []
    
    # Get petty cash
    petty_cash_response = requests.get(
        f"{LEDGER_URL}/api/cashflow/periods/{period_id}/petty-cash",
        headers=headers
    )
    petty_cash = petty_cash_response.json() if petty_cash_response.status_code == 200 else []
    
    return fees, expenses, petty_cash

def calculate_ending_cash(period, fees, expenses, petty_cash):
    """Calculate ending cash for a period"""
    beginning = Decimal(str(period.get('beginningCash', 0)))
    
    # Sum fees
    total_fees = sum(Decimal(str(fee['amount'])) for fee in fees)
    
    # Sum expenses
    total_expenses = sum(Decimal(str(exp['amount'])) for exp in expenses)
    
    # Sum petty cash IN and OUT
    petty_cash_in = sum(Decimal(str(pc['amount'])) for pc in petty_cash if pc['transactionType'] == 'IN')
    petty_cash_out = sum(Decimal(str(pc['amount'])) for pc in petty_cash if pc['transactionType'] == 'OUT')
    
    # Calculate: ending = beginning + fees + petty_cash_in - expenses - petty_cash_out
    ending = beginning + total_fees + petty_cash_in - total_expenses - petty_cash_out
    
    return float(ending), float(total_fees), float(total_expenses), float(petty_cash_in), float(petty_cash_out)

def update_period_cash(period_id, ending_cash, token):
    """Update period ending cash"""
    response = requests.put(
        f"{LEDGER_URL}/api/cashflow/periods/{period_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"endingCash": ending_cash}
    )
    return response.status_code == 200

def main():
    print("=" * 80)
    print("  RECALCULATE CASHFLOW ENDING BALANCES")
    print("=" * 80)
    
    # Login
    print("\n🔐 Logging in...")
    token = login()
    print("✅ Logged in successfully")
    
    # Get all periods
    print("\n📋 Fetching periods...")
    periods = get_periods(token)
    periods_sorted = sorted(periods, key=lambda p: (p['year'], p['month']))
    print(f"Found {len(periods_sorted)} periods")
    
    # Recalculate each period
    print("\n💰 Recalculating ending cash balances...")
    print("-" * 80)
    
    previous_ending = 0
    
    for period in periods_sorted:
        period_id = period['id']
        month_year = period['monthYear']
        
        # Update beginning cash from previous period's ending
        if previous_ending != 0:
            period['beginningCash'] = previous_ending
        
        # Get transactions
        fees, expenses, petty_cash = get_period_details(period_id, token)
        
        # Calculate ending cash
        ending, total_fees, total_expenses, pc_in, pc_out = calculate_ending_cash(
            period, fees, expenses, petty_cash
        )
        
        print(f"\n{month_year}:")
        print(f"  Beginning: ${period.get('beginningCash', 0):,.2f}")
        print(f"  + Fees: ${total_fees:,.2f}")
        print(f"  + Petty Cash IN: ${pc_in:,.2f}")
        print(f"  - Expenses: ${total_expenses:,.2f}")
        print(f"  - Petty Cash OUT: ${pc_out:,.2f}")
        print(f"  = Ending: ${ending:,.2f}")
        
        # Update period
        if update_period_cash(period_id, ending, token):
            print(f"  ✅ Updated")
        else:
            print(f"  ❌ Failed to update")
        
        previous_ending = ending
    
    print("\n" + "=" * 80)
    print("  ✅ RECALCULATION COMPLETE!")
    print("=" * 80)

if __name__ == "__main__":
    main()
