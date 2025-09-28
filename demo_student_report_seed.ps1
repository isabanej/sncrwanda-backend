<#
 Seeds one demo student report row for an existing student and teacher.
 Usage (defaults embedded):
   powershell -File .\demo_student_report_seed.ps1
   powershell -File .\demo_student_report_seed.ps1 -StudentId <id> -TeacherId <id> -BranchId <id> -Term '2025 Term 3'
 Requires: running postgres container (deploy-postgres-1)
#>

param(
  [string]$StudentId = 'd5ee9051-d568-4f59-a602-437672db3da1',   # existing student
  [string]$TeacherId = 'a726bda2-59fd-4270-a625-1467821d0d77',   # existing teacher (employee id)
  [string]$BranchId  = '64aa395a-b3b8-446d-a8a5-7fda8aaa422d',   # branch shared by both
  [string]$Term      = '2025 Term 3'
)

if (-not $StudentId -or -not $TeacherId -or -not $BranchId) {
  Write-Error 'StudentId / TeacherId / BranchId must be provided.'
  exit 1
}

$reportId = [guid]::NewGuid().ToString()
$comments = 'Student shows solid progress in literacy and numeracy.'
$plan     = 'Focus on reading comprehension; add 15 mins daily practice.'
$date     = (Get-Date).ToString('yyyy-MM-dd')

$insert = @"
INSERT INTO student.student_reports (id, branch_id, comments, date, improvement_plan, student_id, teacher_id, term)
VALUES ('$reportId', '$BranchId', '$comments', '$date', '$plan', '$StudentId', '$TeacherId', '$Term');
"@

Write-Host "Inserting demo student report $reportId ..."
docker exec -i deploy-postgres-1 psql -U postgres -d sncrwanda -c "$insert" | Out-Null

Write-Host 'Inserted row:'
docker exec -i deploy-postgres-1 psql -U postgres -d sncrwanda -c "select id, branch_id, student_id, teacher_id, term, date from student.student_reports where id='$reportId';"

Write-Host 'Student total report count:'
docker exec -i deploy-postgres-1 psql -U postgres -d sncrwanda -c "select count(*) as report_count from student.student_reports where student_id='$StudentId';"

Write-Host 'Done. If auth + reporting services are running and you are SUPER_ADMIN, /reports/summary should reflect the new studentReportCount.'
