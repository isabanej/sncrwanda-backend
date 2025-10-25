import { useState, useEffect } from 'react';
import cashflow from '../services/cashflow';
import type { CashflowPeriod as BaseCashflowPeriod } from '../services/cashflow';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './LedgerDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface CashflowPeriod extends BaseCashflowPeriod {
  totalIncome?: number;
  totalExpenses?: number;
  totalFees?: number;
}

export const LedgerDashboard = () => {
  const [allPeriods, setAllPeriods] = useState<CashflowPeriod[]>([]);
  const [periods, setPeriods] = useState<CashflowPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = All Months
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterData();
  }, [selectedYear, selectedMonth, allPeriods]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await cashflow.getPeriods();
      console.log('Loaded periods:', data); // Debug log
      
      // Get unique years from data
      const years = [...new Set(data.map((p: CashflowPeriod) => p.year))].sort();
      setAvailableYears(years);
      
      // If selected year doesn't exist in data, use the first available year
      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[0]);
      }
      
      setAllPeriods(data);
    } catch (err: any) {
      console.error('Load error details:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load financial data';
      setError(`Failed to load financial data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = allPeriods.filter((p: CashflowPeriod) => p.year === selectedYear);
    
    // Filter by month if not "All Months" (0)
    if (selectedMonth !== 0) {
      filtered = filtered.filter((p: CashflowPeriod) => p.month === selectedMonth);
    }
    
    // Sort by month
    filtered.sort((a: CashflowPeriod, b: CashflowPeriod) => a.month - b.month);
    setPeriods(filtered);
  };

  const formatRWF = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Compact formatting for display - shows full numbers with commas
  const formatCompactRWF = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToExcel = () => {
    // Create CSV content
    let csv = 'Period,Beginning Cash,Income,Student Fees,Expenses,Net Flow,Ending Cash,Status\n';
    
    periods.forEach(period => {
      const netFlow = (period.totalIncome || 0) - (period.totalExpenses || 0);
      csv += `"${period.periodName}",${period.beginningCash},${period.totalIncome || 0},${period.totalFees || 0},${period.totalExpenses || 0},${netFlow},${period.endingCash},"${period.status}"\n`;
    });
    
    // Add totals row
    csv += `"TOTALS",${summary.beginningBalance},${summary.totalIncome},${summary.totalFees},${summary.totalExpenses},${summary.netCashFlow},${summary.currentCash},""\n`;
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_report_${selectedYear}_${selectedMonth !== 0 ? `month_${selectedMonth}` : 'all_months'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text(`Financial Dashboard - ${selectedYear}${selectedMonth !== 0 ? ` (${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth - 1]})` : ' (All Months)'}`, 14, 15);
    
    // Add KPI Cards Section
    doc.setFontSize(14);
    doc.text('Key Performance Indicators', 14, 28);
    
    // KPI Card styling
    const kpiY = 35;
    const kpiHeight = 20;
    const kpiWidth = 67;
    const spacing = 4;
    
    // Draw KPI cards in 2 rows x 4 columns (8 cards total)
    const kpis = [
      { label: 'Beginning Balance', value: formatCompactRWF(summary.beginningBalance), subtitle: 'Initial Start-Up Capital', color: [52, 152, 219] },
      { label: 'Total Income', value: formatCompactRWF(summary.totalIncome), subtitle: `Avg: ${formatCompactRWF(summary.averageMonthlyIncome)}/month`, color: [46, 204, 113] },
      { label: 'Total Expenses', value: formatCompactRWF(summary.totalExpenses), subtitle: `Avg: ${formatCompactRWF(summary.averageMonthlyExpenses)}/month`, color: [231, 76, 60] },
      { label: 'Net Cash Flow', value: formatCompactRWF(summary.netCashFlow), subtitle: summary.netCashFlow >= 0 ? 'Surplus' : 'Deficit', color: summary.netCashFlow >= 0 ? [46, 204, 113] : [231, 76, 60] },
      { label: 'Current Cash', value: formatCompactRWF(summary.currentCash), subtitle: 'As of latest period', color: [52, 152, 219] },
      { label: 'Student Fee Revenue', value: formatCompactRWF(summary.totalFees), subtitle: '100.0% of total income', color: [155, 89, 182] },
      { label: 'Petty Cash Balance', value: formatCompactRWF(summary.pettyCashBalance), subtitle: `In: ${formatCompactRWF(summary.pettyCashIn)} | Out: ${formatCompactRWF(summary.pettyCashOut)}`, color: [26, 188, 156] },
      { label: 'Burn Rate', value: summary.burnRate > 0 ? `${Math.round(summary.burnRate)} months` : 'N/A', subtitle: 'Cash runway remaining', color: [243, 156, 18] }
    ];
    
    kpis.forEach((kpi, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      const x = 14 + (col * (kpiWidth + spacing));
      const y = kpiY + (row * (kpiHeight + spacing));
      
      // Draw border
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(x, y, kpiWidth, kpiHeight, 2, 2, 'FD');
      
      // Draw left accent bar (thicker for visual impact)
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(x, y, 4, kpiHeight, 'F');
      
      // Label
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(kpi.label, x + 8, y + 6);
      
      // Value
      doc.setFontSize(12);
      doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, x + 8, y + 13);
      doc.setFont('helvetica', 'normal');
      
      // Subtitle
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(kpi.subtitle, x + 8, y + 17);
    });
    
    // Add Monthly Financial Report title
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Monthly Financial Report', 14, 95);
    
    // Prepare table data
    const tableData = periods.map(period => {
      const netFlow = (period.totalIncome || 0) - (period.totalExpenses || 0);
      return [
        period.periodName,
        formatCompactRWF(period.beginningCash),
        formatCompactRWF(period.totalIncome || 0),
        formatCompactRWF(period.totalFees || 0),
        formatCompactRWF(period.totalExpenses || 0),
        formatCompactRWF(netFlow),
        formatCompactRWF(period.endingCash),
        period.status
      ];
    });
    
    // Add totals row
    tableData.push([
      'TOTALS',
      formatCompactRWF(summary.beginningBalance),
      formatCompactRWF(summary.totalIncome),
      formatCompactRWF(summary.totalFees),
      formatCompactRWF(summary.totalExpenses),
      formatCompactRWF(summary.netCashFlow),
      formatCompactRWF(summary.currentCash),
      ''
    ]);
    
    // Generate table
    autoTable(doc, {
      head: [['Period', 'Beginning Cash', 'Income', 'Student Fees', 'Expenses', 'Net Flow', 'Ending Cash', 'Status']],
      body: tableData,
      startY: 102,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
      didParseCell: function(data: any) {
        // Make totals row bold
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [236, 240, 241];
        }
      }
    });
    
    // Save PDF
    doc.save(`financial_report_${selectedYear}_${selectedMonth !== 0 ? `month_${selectedMonth}` : 'all_months'}.pdf`);
  };

  const calculateSummary = () => {
    const totalIncome = periods.reduce((sum, p) => sum + (p.totalIncome || 0), 0);
    const totalExpenses = periods.reduce((sum, p) => sum + (p.totalExpenses || 0), 0);
    const totalFees = periods.reduce((sum, p) => sum + (p.totalFees || 0), 0);
    const netCashFlow = totalIncome - totalExpenses;
    
    // Current cash is the ending cash of the last period
    const currentCash = periods.length > 0 ? periods[periods.length - 1].endingCash : 0;
    
    // Find the first period with beginning cash (Start Up balance)
    const firstPeriodWithBalance = periods.find(p => p.beginningCash > 0);
    const beginningBalance = firstPeriodWithBalance ? firstPeriodWithBalance.beginningCash : 0;
    
    // Petty cash IN and OUT (hardcoded for now - should come from API)
    const pettyCashIn = 200012;
    const pettyCashOut = 70000;
    const pettyCashBalance = pettyCashIn - pettyCashOut;

    return {
      totalIncome,
      totalExpenses,
      totalFees,
      netCashFlow,
      currentCash,
      beginningBalance,
      pettyCashIn,
      pettyCashOut,
      pettyCashBalance,
      averageMonthlyIncome: periods.length > 0 ? totalIncome / periods.length : 0,
      averageMonthlyExpenses: periods.length > 0 ? totalExpenses / periods.length : 0,
      burnRate: currentCash > 0 && totalExpenses > 0 ? currentCash / (totalExpenses / periods.length) : 0,
    };
  };

  const summary = calculateSummary();

  // Prepare chart data
  const monthNames = periods.map(p => p.periodName);
  
  const cashFlowChartData = {
    labels: monthNames,
    datasets: [
      {
        label: 'Income (RWF)',
        data: periods.map(p => p.totalIncome || 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Expenses (RWF)',
        data: periods.map(p => p.totalExpenses || 0),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Net Cash Flow (RWF)',
        data: periods.map(p => (p.totalIncome || 0) - (p.totalExpenses || 0)),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const expensesBarData = {
    labels: monthNames,
    datasets: [
      {
        label: 'Monthly Expenses (RWF)',
        data: periods.map(p => p.totalExpenses || 0),
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
      },
    ],
  };

  const cashBalanceData = {
    labels: monthNames,
    datasets: [
      {
        label: 'Ending Cash Balance (RWF)',
        data: periods.map(p => p.endingCash),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const incomeBreakdownData = {
    labels: ['Student Fees', 'Other Income'],
    datasets: [
      {
        data: [summary.totalFees, summary.totalIncome - summary.totalFees],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += formatRWF(context.parsed.y);
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCompactRWF(value);
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading financial data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">{error}</div>
        <button onClick={loadData} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="ledger-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>📊 Financial Dashboard & Reports</h1>
          <p>Comprehensive financial analysis and monitoring for {selectedYear}{selectedMonth !== 0 ? ` - ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth - 1]}` : ' (All Months)'}</p>
        </div>
        <div className="dashboard-controls">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="year-selector"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="month-selector"
          >
            <option value={0}>All Months</option>
            <option value={1}>January</option>
            <option value={2}>February</option>
            <option value={3}>March</option>
            <option value={4}>April</option>
            <option value={5}>May</option>
            <option value={6}>June</option>
            <option value={7}>July</option>
            <option value={8}>August</option>
            <option value={9}>September</option>
            <option value={10}>October</option>
            <option value={11}>November</option>
            <option value={12}>December</option>
          </select>
          <button 
            className={`btn ${viewMode === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('overview')}
          >
            Overview
          </button>
          <button 
            className={`btn ${viewMode === 'detailed' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('detailed')}
          >
            Detailed Reports
          </button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-info">
          <div className="kpi-icon">💵</div>
          <div className="kpi-content">
            <h3>Beginning Balance</h3>
            <div className="kpi-value">{formatCompactRWF(summary.beginningBalance)}</div>
            <div className="kpi-subtitle">Initial Start-Up Capital</div>
          </div>
        </div>

        <div className="kpi-card kpi-positive">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <h3>Total Income</h3>
            <div className="kpi-value">{formatCompactRWF(summary.totalIncome)}</div>
            <div className="kpi-subtitle">
              Avg: {formatCompactRWF(summary.averageMonthlyIncome)}/month
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-negative">
          <div className="kpi-icon">💸</div>
          <div className="kpi-content">
            <h3>Total Expenses</h3>
            <div className="kpi-value">{formatCompactRWF(summary.totalExpenses)}</div>
            <div className="kpi-subtitle">
              Avg: {formatCompactRWF(summary.averageMonthlyExpenses)}/month
            </div>
          </div>
        </div>

        <div className={`kpi-card ${summary.netCashFlow >= 0 ? 'kpi-positive' : 'kpi-negative'}`}>
          <div className="kpi-icon">{summary.netCashFlow >= 0 ? '📈' : '📉'}</div>
          <div className="kpi-content">
            <h3>Net Cash Flow</h3>
            <div className="kpi-value">
              {summary.netCashFlow >= 0 ? '' : '-'}{formatCompactRWF(Math.abs(summary.netCashFlow))}
            </div>
            <div className="kpi-subtitle">
              {summary.netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-info">
          <div className="kpi-icon">🏦</div>
          <div className="kpi-content">
            <h3>Current Cash Balance</h3>
            <div className="kpi-value">{formatCompactRWF(summary.currentCash)}</div>
            <div className="kpi-subtitle">As of latest period</div>
          </div>
        </div>

        <div className="kpi-card kpi-student">
          <div className="kpi-icon">🎓</div>
          <div className="kpi-content">
            <h3>Student Fee Revenue</h3>
            <div className="kpi-value">{formatCompactRWF(summary.totalFees)}</div>
            <div className="kpi-subtitle">
              {summary.totalIncome > 0 ? 
                `${((summary.totalFees / summary.totalIncome) * 100).toFixed(1)}% of total income` :
                'No income recorded'
              }
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-success">
          <div className="kpi-icon">💳</div>
          <div className="kpi-content">
            <h3>Petty Cash Balance</h3>
            <div className="kpi-value">{formatCompactRWF(summary.pettyCashBalance)}</div>
            <div className="kpi-subtitle">
              In: {formatCompactRWF(summary.pettyCashIn)} | Out: {formatCompactRWF(summary.pettyCashOut)}
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-icon">📊</div>
          <div className="kpi-content">
            <h3>Burn Rate</h3>
            <div className="kpi-value">
              {summary.burnRate > 0
                ? `${Math.round(summary.burnRate)} months`
                : 'N/A'}
            </div>
            <div className="kpi-subtitle">
              {summary.burnRate > 0
                ? 'Cash runway remaining'
                : 'Insufficient data'}
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'overview' && (
        <>
          {/* Main Charts */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>💹 Cash Flow Trend</h3>
              <div className="chart-container">
                <Line data={cashFlowChartData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-card">
              <h3>📊 Monthly Expenses</h3>
              <div className="chart-container">
                <Bar data={expensesBarData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-card">
              <h3>💵 Cash Balance Over Time</h3>
              <div className="chart-container">
                <Line data={cashBalanceData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-card">
              <h3>🥧 Income Breakdown</h3>
              <div className="chart-container">
                <Doughnut 
                  data={incomeBreakdownData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context: any) {
                            const label = context.label || '';
                            const value = formatRWF(context.parsed);
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === 'detailed' && (
        <>
          {/* Detailed Monthly Report Table */}
          <div className="report-section">
            <div className="report-header-with-actions">
              <h2>📋 Monthly Financial Report</h2>
              <div className="export-buttons">
                <button onClick={exportToExcel} className="btn btn-export">
                  📊 Export to Excel
                </button>
                <button onClick={exportToPDF} className="btn btn-export">
                  📄 Export to PDF
                </button>
              </div>
            </div>
            <div className="table-responsive">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="text-right">Beginning Cash</th>
                    <th className="text-right">Income</th>
                    <th className="text-right">Student Fees</th>
                    <th className="text-right">Expenses</th>
                    <th className="text-right">Net Flow</th>
                    <th className="text-right">Ending Cash</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => {
                    const netFlow = (period.totalIncome || 0) - (period.totalExpenses || 0);
                    return (
                      <tr key={period.id}>
                        <td><strong>{period.periodName}</strong></td>
                        <td className="text-right">{formatCompactRWF(period.beginningCash)}</td>
                        <td className="text-right positive">{formatCompactRWF(period.totalIncome || 0)}</td>
                        <td className="text-right positive">{formatCompactRWF(period.totalFees || 0)}</td>
                        <td className="text-right negative">{formatCompactRWF(period.totalExpenses || 0)}</td>
                        <td className={`text-right ${netFlow >= 0 ? 'positive' : 'negative'}`}>
                          {formatCompactRWF(netFlow)}
                        </td>
                        <td className="text-right"><strong>{formatCompactRWF(period.endingCash)}</strong></td>
                        <td>
                          <span className={`status-badge status-${period.status.toLowerCase()}`}>
                            {period.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="totals-row">
                    <td><strong>TOTALS</strong></td>
                    <td className="text-right"><strong>{formatCompactRWF(periods[0]?.beginningCash || 0)}</strong></td>
                    <td className="text-right positive"><strong>{formatCompactRWF(summary.totalIncome)}</strong></td>
                    <td className="text-right positive"><strong>{formatCompactRWF(summary.totalFees)}</strong></td>
                    <td className="text-right negative"><strong>{formatCompactRWF(summary.totalExpenses)}</strong></td>
                    <td className={`text-right ${summary.netCashFlow >= 0 ? 'positive' : 'negative'}`}>
                      <strong>{formatCompactRWF(summary.netCashFlow)}</strong>
                    </td>
                    <td className="text-right"><strong>{formatCompactRWF(summary.currentCash)}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Financial Health Indicators */}
          <div className="report-section">
            <h2>🏥 Financial Health Indicators</h2>
            <div className="health-indicators">
              <div className="indicator">
                <h4>💪 Liquidity Ratio</h4>
                <div className="indicator-value">
                  {summary.averageMonthlyExpenses > 0
                    ? (summary.currentCash / summary.averageMonthlyExpenses).toFixed(2)
                    : 'N/A'
                  }
                </div>
                <p className="indicator-desc">
                  Months of expenses covered by current cash
                  {summary.currentCash / summary.averageMonthlyExpenses >= 3 && (
                    <span className="health-good"> ✓ Healthy</span>
                  )}
                  {summary.currentCash / summary.averageMonthlyExpenses < 3 && summary.currentCash / summary.averageMonthlyExpenses >= 1 && (
                    <span className="health-warning"> ⚠ Moderate</span>
                  )}
                  {summary.currentCash / summary.averageMonthlyExpenses < 1 && (
                    <span className="health-critical"> ⚠️ Critical</span>
                  )}
                </p>
              </div>

              <div className="indicator">
                <h4>📈 Revenue Growth</h4>
                <div className="indicator-value">
                  {periods.length >= 2
                    ? `${(((periods[periods.length - 1].totalIncome || 0) - (periods[0].totalIncome || 0)) / (periods[0].totalIncome || 1) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <p className="indicator-desc">Change from first to last period</p>
              </div>

              <div className="indicator">
                <h4>💰 Expense Ratio</h4>
                <div className="indicator-value">
                  {summary.totalIncome > 0
                    ? `${((summary.totalExpenses / summary.totalIncome) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <p className="indicator-desc">Expenses as % of income</p>
              </div>

              <div className="indicator">
                <h4>🎓 Fee Collection Rate</h4>
                <div className="indicator-value">
                  {summary.totalIncome > 0
                    ? `${((summary.totalFees / summary.totalIncome) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <p className="indicator-desc">Student fees as % of total income</p>
              </div>
            </div>
          </div>

          {/* Executive Summary for Board */}
          <div className="report-section executive-summary">
            <h2>📑 Executive Summary for Board of Directors</h2>
            <div className="summary-content">
              <h3>Financial Performance - {selectedYear}</h3>
              <p><strong>Period Covered:</strong> {periods.length} months ({periods[0]?.periodName} - {periods[periods.length - 1]?.periodName})</p>
              
              <h4>Key Highlights:</h4>
              <ul>
                <li>
                  <strong>Total Revenue:</strong> {formatRWF(summary.totalIncome)}
                  <ul>
                    <li>Student Fee Revenue: {formatRWF(summary.totalFees)} ({((summary.totalFees / summary.totalIncome) * 100).toFixed(1)}%)</li>
                    <li>Other Income: {formatRWF(summary.totalIncome - summary.totalFees)} ({(((summary.totalIncome - summary.totalFees) / summary.totalIncome) * 100).toFixed(1)}%)</li>
                  </ul>
                </li>
                <li>
                  <strong>Total Operating Expenses:</strong> {formatRWF(summary.totalExpenses)}
                  <ul>
                    <li>Average Monthly Expenses: {formatRWF(summary.averageMonthlyExpenses)}</li>
                    <li>Expense to Revenue Ratio: {((summary.totalExpenses / summary.totalIncome) * 100).toFixed(1)}%</li>
                  </ul>
                </li>
                <li>
                  <strong>Net Cash Flow:</strong> {formatRWF(summary.netCashFlow)} 
                  {summary.netCashFlow >= 0 ? ' (Surplus ✓)' : ' (Deficit ⚠️)'}
                </li>
                <li>
                  <strong>Current Cash Position:</strong> {formatRWF(summary.currentCash)}
                  <ul>
                    <li>Liquidity: {(summary.currentCash / summary.averageMonthlyExpenses).toFixed(1)} months of operating expenses</li>
                  </ul>
                </li>
              </ul>

              <h4>Recommendations:</h4>
              <ul>
                {summary.currentCash / summary.averageMonthlyExpenses < 3 && (
                  <li className="recommendation-critical">
                    🚨 <strong>Critical:</strong> Cash reserves below 3 months. Recommend immediate focus on:
                    <ul>
                      <li>Accelerating student fee collection</li>
                      <li>Identifying non-essential expenses for reduction</li>
                      <li>Exploring additional revenue streams</li>
                    </ul>
                  </li>
                )}
                {summary.netCashFlow < 0 && (
                  <li className="recommendation-warning">
                    ⚠️ <strong>Negative Cash Flow:</strong> Expenses exceed income. Review:
                    <ul>
                      <li>Cost optimization opportunities</li>
                      <li>Revenue enhancement strategies</li>
                      <li>Staffing and operational efficiency</li>
                    </ul>
                  </li>
                )}
                {(summary.totalExpenses / summary.totalIncome) > 0.9 && (
                  <li className="recommendation-info">
                    📊 <strong>High Expense Ratio:</strong> Operating expenses at {((summary.totalExpenses / summary.totalIncome) * 100).toFixed(0)}% of revenue
                    <ul>
                      <li>Consider implementing cost control measures</li>
                      <li>Review vendor contracts and negotiate better terms</li>
                      <li>Analyze spending by category for optimization</li>
                    </ul>
                  </li>
                )}
                {summary.netCashFlow >= 0 && summary.currentCash / summary.averageMonthlyExpenses >= 3 && (
                  <li className="recommendation-positive">
                    ✅ <strong>Strong Financial Position:</strong> Continue current trajectory
                    <ul>
                      <li>Consider strategic investments in infrastructure</li>
                      <li>Build emergency reserve fund to 6 months</li>
                      <li>Explore growth opportunities</li>
                    </ul>
                  </li>
                )}
              </ul>

              <div className="report-footer">
                <p><em>Report generated: {new Date().toLocaleDateString('en-RW', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</em></p>
                <p><em>All amounts in Rwandan Francs (RWF)</em></p>
              </div>
            </div>
          </div>

          {/* Print Button */}
          <div className="action-buttons">
            <button 
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              🖨️ Print/Export Report
            </button>
            <button 
              className="btn btn-secondary"
              onClick={loadData}
            >
              🔄 Refresh Data
            </button>
          </div>
        </>
      )}

      {/* Hidden section - only visible when printing */}
      <div className="print-only-section">
        <h2>📋 Monthly Financial Report - {selectedYear}</h2>
        {periods.length === 0 ? (
          <p>No data available for the selected period.</p>
        ) : (
          <table className="financial-table">
            <thead>
              <tr>
                <th>Period</th>
                <th className="text-right">Beginning Cash</th>
                <th className="text-right">Income</th>
                <th className="text-right">Student Fees</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">Net Flow</th>
                <th className="text-right">Ending Cash</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const netFlow = (period.totalIncome || 0) - (period.totalExpenses || 0);
                return (
                  <tr key={`print-${period.id}`}>
                    <td><strong>{period.periodName}</strong></td>
                    <td className="text-right">{formatCompactRWF(period.beginningCash)}</td>
                    <td className="text-right positive">{formatCompactRWF(period.totalIncome || 0)}</td>
                    <td className="text-right positive">{formatCompactRWF(period.totalFees || 0)}</td>
                    <td className="text-right negative">{formatCompactRWF(period.totalExpenses || 0)}</td>
                    <td className={`text-right ${netFlow >= 0 ? 'positive' : 'negative'}`}>
                      {formatCompactRWF(netFlow)}
                    </td>
                    <td className="text-right"><strong>{formatCompactRWF(period.endingCash)}</strong></td>
                    <td>
                      <span className={`status-badge status-${period.status.toLowerCase()}`}>
                        {period.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td><strong>TOTALS</strong></td>
                <td className="text-right"><strong>{formatCompactRWF(summary.beginningBalance)}</strong></td>
                <td className="text-right positive"><strong>{formatCompactRWF(summary.totalIncome)}</strong></td>
                <td className="text-right positive"><strong>{formatCompactRWF(summary.totalFees)}</strong></td>
                <td className="text-right negative"><strong>{formatCompactRWF(summary.totalExpenses)}</strong></td>
                <td className={`text-right ${summary.netCashFlow >= 0 ? 'positive' : 'negative'}`}>
                  <strong>{formatCompactRWF(summary.netCashFlow)}</strong>
                </td>
                <td className="text-right"><strong>{formatCompactRWF(summary.currentCash)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};
