"""
Direct Excel Import Script for Cashflow System
Bypasses the gateway multipart issues by directly calling the backend API
"""

import requests
import json
from pathlib import Path

# Configuration
EXCEL_FILE = r"c:\dev\sncrwanda-backend\frontend-new\public\SNC Rwanda - 12 Month Income & Expense Projection = CashflowProjection.xlsx"
API_BASE = "http://localhost:8082"  # Direct to ledger-service
AUTH_URL = "http://localhost:9092/auth/login"
ORG_ID = "550e8400-e29b-41d4-a716-446655440000"  # Default org ID
IMPORT_USER_ID = "00000000-0000-0000-0000-000000000001"  # Default user for import

def login():
    """Login and get JWT token"""
    print("🔐 Logging in...")
    response = requests.post(AUTH_URL, json={
        "username": "emino",
        "password": "123456"
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        user_id = data.get('userId')
        print(f"✅ Login successful! User ID: {user_id}")
        return token, user_id
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None, None

def validate_excel(token):
    """Validate the Excel file"""
    print("\n📋 Validating Excel file...")
    
    file_path = Path(EXCEL_FILE)
    if not file_path.exists():
        print(f"❌ File not found: {file_path.absolute()}")
        return False
    
    with open(file_path, 'rb') as f:
        files = {'file': (file_path.name, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        headers = {'Authorization': f'Bearer {token}'}
        
        response = requests.post(
            f"{API_BASE}/api/cashflow/import/validate",
            files=files,
            headers=headers
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Validation response:")
            print(json.dumps(result, indent=2))
            return result.get('valid', False)
        else:
            print(f"❌ Validation failed: {response.status_code}")
            print(response.text)
            return False

def import_excel(token, user_id):
    """Import the Excel file"""
    print("\n📥 Importing Excel file...")
    
    file_path = Path(EXCEL_FILE)
    
    with open(file_path, 'rb') as f:
        files = {'file': (file_path.name, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        data = {
            'orgId': ORG_ID,
            'importedBy': IMPORT_USER_ID  # Use default UUID
        }
        headers = {'Authorization': f'Bearer {token}'}
        
        print(f"Sending request with:")
        print(f"  - File: {file_path.name}")
        print(f"  - orgId: {data['orgId']}")
        print(f"  - importedBy: {data['importedBy']}")
        
        response = requests.post(
            f"{API_BASE}/api/cashflow/import/excel",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response body: {response.text[:500]}")  # First 500 chars
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Import successful!")
            print(json.dumps(result, indent=2))
            return True
        else:
            print(f"❌ Import failed: {response.status_code}")
            print(response.text)
            return False

def verify_import(token):
    """Verify the imported data"""
    print("\n🔍 Verifying imported data...")
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get all periods
    response = requests.get(
        f"{API_BASE}/api/cashflow/periods?orgId={ORG_ID}",
        headers=headers
    )
    
    if response.status_code == 200:
        periods = response.json()
        print(f"✅ Found {len(periods)} periods in database:")
        for period in periods:
            print(f"  - {period['periodName']} ({period['status']}): Beginning ${period['beginningCash']:.2f} -> Ending ${period['endingCash']:.2f}")
        return True
    else:
        print(f"❌ Failed to fetch periods: {response.status_code}")
        return False

def main():
    print("=" * 80)
    print("  CASHFLOW EXCEL IMPORT - DIRECT API APPROACH")
    print("=" * 80)
    
    # Step 1: Login
    token, user_id = login()
    if not token:
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Step 2: Validate Excel
    if not validate_excel(token):
        print("\n⚠️  Validation failed, but attempting import anyway...")
    
    # Step 3: Import Excel
    if import_excel(token, user_id):
        # Step 4: Verify
        verify_import(token)
        print("\n" + "=" * 80)
        print("  ✅ IMPORT COMPLETE!")
        print("=" * 80)
    else:
        print("\n" + "=" * 80)
        print("  ❌ IMPORT FAILED")
        print("=" * 80)

if __name__ == "__main__":
    main()
