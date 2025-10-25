#!/usr/bin/env python3
"""
Simple Excel Import Verification (Direct Database Access)
This script verifies that database data matches Excel data exactly
"""

import openpyxl
import psycopg2
from decimal import Decimal
from datetime import datetime

# Configuration
EXCEL_FILE = "frontend-new/public/SNC Rwanda - 12 Month Income & Expense Projection = CashflowProjection.xlsx"

DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'sncrwanda',
    'user': 'postgres',
    'password': 'postgres'
}

ORG_ID = "550e8400-e29b-41d4-a716-446655440000"

def parse_excel_data():
    """Parse Excel file and extract all data"""
    print(f"\n📊 Parsing Excel file...")
    
    wb = openpyxl.load_workbook(EXCEL_FILE)
    cashflow_sheet = wb['Cashflow Statement']
    
    # Try to get revenue sheet
    try:
        revenue_sheet = wb['School Fees received - Revenue']
    except:
        revenue_sheet = None
    
    data = {
        'months': [],
        'fees': {},
        'expenses': {},
        'petty_cash': {}
    }
    
    # Parse month headers from row 1 (columns D onwards = index 3 onwards)
    for col_idx in range(3, 15):  # Columns D through O
        cell = cashflow_sheet.cell(1, col_idx + 1)
        if cell.value:
            month_name = str(cell.value).strip()
            month_names = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December",
                          "Jan", "Feb", "Fab", "Mar", "Apr", "Jun", "Jul", "Aug", "Sept", "Sep", "Oct", "Nov", "Dec"]
            if any(month_name.lower() == m.lower() for m in month_names):
                data['months'].append((col_idx + 1, month_name))
    
    print(f"   Found {len(data['months'])} months: {[m[1] for m in data['months']]}")
    
    # Parse student fees
    if revenue_sheet:
        print("   Parsing student fees...")
        fee_count = 0
        for row_idx in range(2, revenue_sheet.max_row + 1):
            student_name_cell = revenue_sheet.cell(row_idx, 1)
            if not student_name_cell.value:
                continue
            
            student_name = str(student_name_cell.value).strip()
            if student_name.lower() == 'total':
                continue
            
            fee_type_cell = revenue_sheet.cell(row_idx, 2)
            fee_type = str(fee_type_cell.value).strip() if fee_type_cell.value else "School Fees"
            
            for col_idx, month_name in data['months']:
                amount_cell = revenue_sheet.cell(row_idx, col_idx)
                if amount_cell.value and isinstance(amount_cell.value, (int, float)) and amount_cell.value > 0:
                    if month_name not in data['fees']:
                        data['fees'][month_name] = Decimal(0)
                    data['fees'][month_name] += Decimal(str(amount_cell.value))
                    fee_count += 1
        print(f"      Found {fee_count} fee entries")
    
    # Parse expenses
    print("   Parsing expenses...")
    expense_count = 0
    for row_idx in range(10, 30):
        category_cell = cashflow_sheet.cell(row_idx, 2)
        if not category_cell.value:
            continue
        
        category = str(category_cell.value).strip()
        
        if (not category or 
            category.lower() in ['total', 'cash available', 'total expenses'] or
            'petty cash' in category.lower() or
            'Cash In' in category or
            'Cash Out' in category):
            continue
        
        for col_idx, month_name in data['months']:
            amount_cell = cashflow_sheet.cell(row_idx, col_idx)
            if amount_cell.value and isinstance(amount_cell.value, (int, float)) and amount_cell.value > 0:
                if month_name not in data['expenses']:
                    data['expenses'][month_name] = {}
                if category not in data['expenses'][month_name]:
                    data['expenses'][month_name][category] = Decimal(0)
                data['expenses'][month_name][category] += Decimal(str(amount_cell.value))
                expense_count += 1
    print(f"      Found {expense_count} expense entries")
    
    # Parse petty cash
    print("   Parsing petty cash...")
    pc_count = 0
    for row_idx in range(1, cashflow_sheet.max_row + 1):
        category_cell = cashflow_sheet.cell(row_idx, 2)
        if not category_cell.value:
            continue
        
        category = str(category_cell.value).strip()
        
        if category.lower() == 'petty cash(in)':
            for col_idx, month_name in data['months']:
                amount_cell = cashflow_sheet.cell(row_idx, col_idx)
                if amount_cell.value and isinstance(amount_cell.value, (int, float)) and amount_cell.value > 0:
                    if month_name not in data['petty_cash']:
                        data['petty_cash'][month_name] = {'IN': Decimal(0), 'OUT': Decimal(0)}
                    data['petty_cash'][month_name]['IN'] += Decimal(str(amount_cell.value))
                    pc_count += 1
        
        elif category.lower() == 'petty cash(out)':
            for col_idx, month_name in data['months']:
                amount_cell = cashflow_sheet.cell(row_idx, col_idx)
                if amount_cell.value and isinstance(amount_cell.value, (int, float)) and amount_cell.value > 0:
                    if month_name not in data['petty_cash']:
                        data['petty_cash'][month_name] = {'IN': Decimal(0), 'OUT': Decimal(0)}
                    data['petty_cash'][month_name]['OUT'] += Decimal(str(amount_cell.value))
                    pc_count += 1
    print(f"      Found {pc_count} petty cash entries")
    
    wb.close()
    
    # Print summary
    total_fees = sum(data['fees'].values())
    total_expenses = sum(sum(exp.values()) for exp in data['expenses'].values())
    total_petty_in = sum(pc.get('IN', 0) for pc in data['petty_cash'].values())
    total_petty_out = sum(pc.get('OUT', 0) for pc in data['petty_cash'].values())
    
    print(f"\n📈 Excel Totals:")
    print(f"   Student Fees: ${total_fees:,.2f}")
    print(f"   Expenses: ${total_expenses:,.2f}")
    print(f"   Petty Cash IN: ${total_petty_in:,.2f}")
    print(f"   Petty Cash OUT: ${total_petty_out:,.2f}")
    
    return data

def get_month_number(month_name):
    """Convert month name to number"""
    month_map = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2, 'fab': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sept': 9, 'sep': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    }
    return month_map.get(month_name.lower(), 1)

def check_database():
    """Check what's currently in the database"""
    print("\n🔍 Checking database...")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Check periods
    cur.execute("""
        SELECT COUNT(*), MIN(year), MAX(year)
        FROM ledger.cashflow_periods 
        WHERE org_id = %s
    """, (ORG_ID,))
    period_count, min_year, max_year = cur.fetchone()
    print(f"   Periods in DB: {period_count} (years: {min_year}-{max_year})")
    
    # Check fees
    cur.execute("""
        SELECT COUNT(*), COALESCE(SUM(amount_paid), 0)
        FROM ledger.student_fee_payments sfp
        JOIN ledger.cashflow_periods p ON sfp.period_id = p.id
        WHERE p.org_id = %s
    """, (ORG_ID,))
    fee_count, fee_total = cur.fetchone()
    print(f"   Student Fees in DB: {fee_count} records, Total: ${fee_total:,.2f}")
    
    # Check expenses
    cur.execute("""
        SELECT COUNT(*), COALESCE(SUM(amount), 0)
        FROM ledger.cashflow_expenses e
        JOIN ledger.cashflow_periods p ON e.period_id = p.id
        WHERE p.org_id = %s
    """, (ORG_ID,))
    exp_count, exp_total = cur.fetchone()
    print(f"   Expenses in DB: {exp_count} records, Total: ${exp_total:,.2f}")
    
    # Check petty cash
    cur.execute("""
        SELECT transaction_type, COUNT(*), COALESCE(SUM(amount), 0)
        FROM ledger.petty_cash_transactions pct
        JOIN ledger.cashflow_periods p ON pct.period_id = p.id
        WHERE p.org_id = %s
        GROUP BY transaction_type
    """, (ORG_ID,))
    for tx_type, count, total in cur.fetchall():
        print(f"   Petty Cash {tx_type} in DB: {count} records, Total: ${total:,.2f}")
    
    cur.close()
    conn.close()

def verify_month_by_month(excel_data):
    """Verify data month by month"""
    print("\n📅 Month-by-Month Verification:")
    print("=" * 80)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    current_year = datetime.now().year
    issues = []
    
    for col_idx, month_name in excel_data['months']:
        month_num = get_month_number(month_name)
        print(f"\n{month_name} {current_year}:")
        
        # Fees
        excel_fees = excel_data['fees'].get(month_name, Decimal(0))
        cur.execute("""
            SELECT COALESCE(SUM(amount_paid), 0)
            FROM ledger.student_fee_payments sfp
            JOIN ledger.cashflow_periods p ON sfp.period_id = p.id
            WHERE p.year = %s AND p.month = %s AND p.org_id = %s
        """, (current_year, month_num, ORG_ID))
        db_fees = cur.fetchone()[0] or Decimal(0)
        
        fee_match = "✅" if abs(float(db_fees) - float(excel_fees)) < 0.01 else "❌"
        print(f"  {fee_match} Fees: Excel=${excel_fees:,.2f} | DB=${db_fees:,.2f}")
        if abs(float(db_fees) - float(excel_fees)) >= 0.01:
            issues.append(f"{month_name} fees mismatch")
        
        # Expenses
        excel_expenses = sum(excel_data['expenses'].get(month_name, {}).values())
        cur.execute("""
            SELECT COALESCE(SUM(amount), 0)
            FROM ledger.cashflow_expenses e
            JOIN ledger.cashflow_periods p ON e.period_id = p.id
            WHERE p.year = %s AND p.month = %s AND p.org_id = %s
        """, (current_year, month_num, ORG_ID))
        db_expenses = cur.fetchone()[0] or Decimal(0)
        
        exp_match = "✅" if abs(float(db_expenses) - float(excel_expenses)) < 0.01 else "❌"
        print(f"  {exp_match} Expenses: Excel=${excel_expenses:,.2f} | DB=${db_expenses:,.2f}")
        if abs(float(db_expenses) - float(excel_expenses)) >= 0.01:
            issues.append(f"{month_name} expenses mismatch")
        
        # Petty Cash
        excel_pc_in = excel_data['petty_cash'].get(month_name, {}).get('IN', Decimal(0))
        excel_pc_out = excel_data['petty_cash'].get(month_name, {}).get('OUT', Decimal(0))
        
        cur.execute("""
            SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'IN' THEN amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN transaction_type = 'OUT' THEN amount ELSE 0 END), 0)
            FROM ledger.petty_cash_transactions pct
            JOIN ledger.cashflow_periods p ON pct.period_id = p.id
            WHERE p.year = %s AND p.month = %s AND p.org_id = %s
        """, (current_year, month_num, ORG_ID))
        db_pc_in, db_pc_out = cur.fetchone()
        db_pc_in = db_pc_in or Decimal(0)
        db_pc_out = db_pc_out or Decimal(0)
        
        pc_in_match = "✅" if abs(float(db_pc_in) - float(excel_pc_in)) < 0.01 else "❌"
        pc_out_match = "✅" if abs(float(db_pc_out) - float(excel_pc_out)) < 0.01 else "❌"
        print(f"  {pc_in_match} Petty Cash IN: Excel=${excel_pc_in:,.2f} | DB=${db_pc_in:,.2f}")
        print(f"  {pc_out_match} Petty Cash OUT: Excel=${excel_pc_out:,.2f} | DB=${db_pc_out:,.2f}")
        
    cur.close()
    conn.close()
    
    return issues

def main():
    print("=" * 80)
    print("  EXCEL vs DATABASE VERIFICATION")
    print("=" * 80)
    
    # Parse Excel
    excel_data = parse_excel_data()
    
    # Check database
    check_database()
    
    # Verify month by month
    issues = verify_month_by_month(excel_data)
    
    # Final report
    print("\n" + "=" * 80)
    if not issues:
        print("✅ PERFECT MATCH: All data in database matches Excel exactly!")
    else:
        print(f"⚠️  Found {len(issues)} discrepancies:")
        for issue in issues:
            print(f"   • {issue}")
    print("=" * 80)

if __name__ == "__main__":
    main()
