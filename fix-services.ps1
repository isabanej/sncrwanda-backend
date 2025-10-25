# Fix PettyCashService.java
$file = "c:\dev\sncrwanda-backend\ledger-service\src\main\java\org\sncrwanda\ledger\service\PettyCashService.java"
$content = Get-Content $file -Raw

# Replace setPeriodId with setPeriod
$content = $content -replace '\.setPeriodId\(periodId\)', '.setPeriod(period)'

# Replace period access
$content = $content -replace 'periodService\.periodRepo\.findById\(periodId\)\.orElseThrow\(\)', 'period'

# Remove setCreatedAt and setLastUpdated calls
$content = $content -replace '\s+\.setCreatedAt\(LocalDateTime\.now\(\)\);', ''
$content = $content -replace '\s+\.setLastUpdated\(LocalDateTime\.now\(\)\);', ''

# Add period entity fetch before creating transactions
$content = $content -replace '(\s+// Validate period[\s\S]+?periodService\.validatePeriodForEntry\(periodId\);)', "`$1`n`n        // Get period entity`n        CashflowPeriod period = periodService.getPeriodById(periodId);"

Set-Content $file $content

# Fix ExcelImportService.java
$file2 = "c:\dev\sncrwanda-backend\ledger-service\src\main\java\org\sncrwanda\ledger\service\ExcelImportService.java"
$content2 = Get-Content $file2 -Raw

# Replace fee.setPeriodId with fee.setPeriod
$content2 = $content2 -replace 'fee\.setPeriodId\(period\.getId\(\)\)', 'fee.setPeriod(period)'

# Replace expense.setPeriodId with expense.setPeriod
$content2 = $content2 -replace 'expense\.setPeriodId\(period\.getId\(\)\)', 'expense.setPeriod(period)'

# Remove timestamp setters
$content2 = $content2 -replace '\s+fee\.setCreatedAt\([^)]+\);', ''
$content2 = $content2 -replace '\s+fee\.setLastUpdated\([^)]+\);', ''
$content2 = $content2 -replace '\s+expense\.setCreatedAt\([^)]+\);', ''
$content2 = $content2 -replace '\s+expense\.setLastUpdated\([^)]+\);', ''

Set-Content $file2 $content2

# Fix CashflowPeriodController.java
$file3 = "c:\dev\sncrwanda-backend\ledger-service\src\main\java\org\sncrwanda\ledger\web\CashflowPeriodController.java"
$content3 = Get-Content $file3 -Raw

# Replace periodService.periodRepo with periodService.getPeriodById
$content3 = $content3 -replace 'periodService\.periodRepo\.findById\(([^)]+)\)', 'periodService.getPeriodById($1)'

Set-Content $file3 $content3

Write-Host "Service files fixed!" -ForegroundColor Green
