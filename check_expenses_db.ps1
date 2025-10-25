$env:PGPASSWORD = "admin123"
$result = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U admin -d postgres -t -c "SELECT COUNT(*) FROM ledger.cashflow_expenses;"
Write-Host "Total expenses in database: $($result.Trim())"

$result2 = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U admin -d postgres -t -c "SELECT category, amount FROM ledger.cashflow_expenses LIMIT 10;"
Write-Host "`nSample expenses:"
Write-Host $result2
