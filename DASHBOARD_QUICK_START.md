# 🎯 Quick Start Guide - Financial Dashboard

## Access the Dashboard

### URL
```
http://localhost:5173/ledger/dashboard
```

### Login Credentials
- **Username:** emino
- **Password:** 123456
- **Role:** SUPER_ADMIN

## Features Overview

### 📊 KPI Cards (Top Section)
Six key performance indicators:
1. **Total Income** - All revenue including fees
2. **Total Expenses** - All costs (payroll, expenses, petty cash)
3. **Net Cash Flow** - Profit/loss indicator
4. **Current Cash Balance** - Available funds
5. **Student Fee Revenue** - Fee collection tracking
6. **Burn Rate** - Months of runway remaining

### 📈 Two View Modes

#### 1. Overview Mode (Default)
Four interactive charts:
- **Cash Flow Trend** - Line chart showing income, expenses, and net flow over time
- **Monthly Expenses** - Bar chart of monthly spending
- **Cash Balance** - Area chart showing cash position over time
- **Income Breakdown** - Doughnut chart of revenue sources

#### 2. Detailed Reports Mode
Click "Detailed Reports" button to see:
- **Monthly Financial Table** - Complete breakdown by month
- **Financial Health Indicators** - Liquidity, growth, ratios
- **Executive Summary** - Board-ready financial report with intelligent recommendations

### 🔧 Controls

**Year Selector (Dropdown)**
- Choose: 2024, 2025, or 2026
- Data filters automatically

**View Mode Buttons**
- Toggle between Overview and Detailed Reports

**Action Buttons** (in Detailed mode)
- **Print/Export Report** - Generate printable version
- **Refresh Data** - Reload from database

## Currency Format

All amounts displayed in **RWF (Rwandan Francs)**
- Format: "RWF 1,260,000"
- No decimal places (whole numbers)
- Comma-separated thousands

## Current Data (Year 2025)

### ✅ Verified Totals
- **Student Fees:** RWF 1,260,000
  - Jed: RWF 420,000 (Sept)
  - nael: RWF 240,000 (Sept)
  - Gaju: RWF 600,000 (Oct)
  
- **Expenses:** RWF 4,734,000
  - 17 expense records
  - Across Aug-Nov 2025
  
- **Petty Cash:**
  - IN: RWF 200,012 (Oct)
  - OUT: RWF 70,000 (Oct)

- **12 Cashflow Periods:** Jan-Dec 2025 created

## Health Indicators Explained

### 💪 Liquidity Ratio
- **What it is:** Months of expenses covered by current cash
- **Good:** ≥ 3 months (green checkmark)
- **Moderate:** 1-3 months (orange warning)
- **Critical:** < 1 month (red alert)

### 📈 Revenue Growth
- **What it is:** % change from first to last period income
- **Positive:** Revenue increasing (good)
- **Negative:** Revenue decreasing (review needed)

### 💰 Expense Ratio
- **What it is:** Expenses as % of income
- **Good:** < 80% (sustainable)
- **Warning:** 80-90% (tight margins)
- **Critical:** > 90% (cost control needed)

### 🎓 Fee Collection Rate
- **What it is:** Student fees as % of total income
- **Shows:** Dependency on fee revenue vs other sources

## Smart Recommendations

Dashboard automatically provides actionable recommendations:

### 🚨 Critical Alerts (Red)
**Triggered when:** Cash < 3 months of expenses
**Actions suggested:**
- Accelerate student fee collection
- Identify non-essential expenses
- Explore additional revenue streams

### ⚠️ Warnings (Orange)
**Triggered when:** Negative cash flow (expenses > income)
**Actions suggested:**
- Cost optimization opportunities
- Revenue enhancement strategies
- Staffing and operational efficiency review

### 📊 Info (Blue)
**Triggered when:** Expense ratio > 90%
**Actions suggested:**
- Implement cost control measures
- Review vendor contracts
- Analyze spending by category

### ✅ Positive (Green)
**Triggered when:** Healthy position (positive flow + 3+ months reserves)
**Actions suggested:**
- Consider strategic investments
- Build emergency reserve to 6 months
- Explore growth opportunities

## Troubleshooting

### Dashboard Not Loading?
1. Check services: Run `.\check-services.ps1`
2. Restart if needed: Run `.\start-all.ps1`
3. Wait 30-60 seconds for services to start
4. Refresh browser

### No Data Showing?
1. Verify data imported (see LEDGER_DASHBOARD_IMPLEMENTATION.md)
2. Check year filter (data in 2025)
3. Check browser console for errors (F12)
4. Verify ledger service running on port 8082

### Charts Not Rendering?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Check Chart.js loaded (F12 → Network tab)
3. Try different browser
4. Check console for JavaScript errors

### Wrong Totals?
1. Use Python verification scripts in project root
2. Check database directly (PostgreSQL port 5432)
3. Re-import Excel data if needed
4. Verify org ID matches (550e8400-e29b-41d4-a716-446655440000)

## Export and Sharing

### Print Report
1. Click "Print/Export Report" button
2. Browser print dialog opens
3. Options:
   - Print directly
   - Save as PDF
   - Adjust page size/orientation

### Print Tips
- Use Landscape orientation for tables
- Adjust margins if content cuts off
- Print background graphics for colors
- Consider printing Overview and Detailed separately

## Best Practices

### For Board Meetings
1. Use **Detailed Reports** mode
2. Review **Executive Summary** section
3. Focus on **Health Indicators**
4. Print/export before meeting
5. Discuss **Smart Recommendations**

### For Monthly Review
1. Check **KPI Cards** for quick snapshot
2. Review **Cash Flow Trend** chart
3. Compare to previous months
4. Act on **Critical Alerts** immediately

### For Budget Planning
1. Analyze **Monthly Expenses** chart
2. Review **Expense Ratio**
3. Check **Revenue Growth** trend
4. Plan based on **Burn Rate**

## Navigation

### Menu Location
Look for **"Financial Dashboard 📈"** in left sidebar

### Direct Link
Bookmark: `http://localhost:5173/ledger/dashboard`

## Mobile Access

Dashboard is mobile-responsive:
- Single column layout on phones
- Stacked KPI cards
- Scrollable tables
- All features accessible
- Touch-friendly controls

## Data Updates

### Automatic Refresh
- Click "Refresh Data" button
- Changes in database appear immediately
- Charts and tables update automatically

### Manual Recalculation
If totals seem wrong:
1. Use Python script: `recalculate_via_api.py`
2. Or REST API: `POST /api/cashflow/periods/{periodId}/recalculate`

## Support

### Check Services Status
```powershell
.\check-services.ps1
```

### Restart All Services
```powershell
.\start-all.ps1
```

### View Service Logs
Check individual PowerShell windows for each service

### Database Access
```
Host: localhost
Port: 5432
Database: sncrwanda
Schema: ledger
Username: rwandauser
Password: 123456
```

---

## ✨ Ready to Use!

Your comprehensive financial dashboard is now live and accessible at:

🌐 **http://localhost:5173/ledger/dashboard**

Features include:
- ✅ RWF currency formatting
- ✅ Interactive charts and graphs
- ✅ KPI cards with key metrics
- ✅ Board-ready executive reports
- ✅ Smart financial recommendations
- ✅ Print/export functionality
- ✅ Mobile-responsive design

**For detailed technical documentation, see:** `LEDGER_DASHBOARD_IMPLEMENTATION.md`
