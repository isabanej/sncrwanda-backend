<#!
.SYNOPSIS
  Create a student performance report through the API Gateway then verify it exists.

.DESCRIPTION
  - Logs in with provided credentials (or reuses an existing token if you set $Env:SNCR_TOKEN beforehand).
  - Resolves (or requires) a studentId and teacherId.
  - Creates a report (idempotent-ish: will not duplicate if same term + student already exists unless -Force specified).
  - Lists reports to confirm creation and outputs the created report JSON.

.PARAMETER Username
  Login username or email.
.PARAMETER Password
  Login password.
.PARAMETER StudentId
  Specific student UUID. If not provided the script picks the first student returned.
.PARAMETER TeacherId
  Teacher UUID. If omitted and the logged in user has TEACHER role, uses that user's id; if ADMIN and omitted picks first teacher from /hr/teachers.
.PARAMETER Term
  Academic term label (default: current year + '-Q1').
.PARAMETER Comments
  Comments text (optional, default sample message).
.PARAMETER ImprovementPlan
  Improvement plan text (optional).
.PARAMETER Date
  Report date (yyyy-MM-dd). Defaults to today.
.PARAMETER Force
  When supplied, creates another report even if one with same student+term exists.

.EXAMPLE
  ./create_student_report.ps1 -Username admin -Password Passw0rd! -Term 2025-Q3

#>
[CmdletBinding()]
param(
  [string]$Username,
  # NOTE: For simplicity using plain string; consider changing to [SecureString] for production hardening.
  [string]$Password,
  [string]$StudentId,
  [string]$TeacherId,
  [string]$Term = (Get-Date -Format 'yyyy') + '-Q1',
  [string]$Comments = 'Progressing steadily',
  [string]$ImprovementPlan = 'Allocate 30 mins practice daily',
  [string]$Date = (Get-Date -Format 'yyyy-MM-dd'),
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:9090'

function Invoke-Json {
  param($Url, $Method, $Body = $null, $Token)
  $headers = @{ 'Content-Type'='application/json' }
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  $json = $null
  if ($null -ne $Body) { $json = ($Body | ConvertTo-Json -Depth 6) }
  return Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -Body $json -ErrorAction Stop
}

Write-Host '== Student Report Creation Script ==' -ForegroundColor Cyan

# 1. Acquire token
$token = $Env:SNCR_TOKEN
$userObj = $null
if (-not $token) {
  if (-not $Username -or -not $Password) { throw 'Username & Password required (or set $Env:SNCR_TOKEN)' }
  Write-Host 'Logging in...' -ForegroundColor DarkCyan
  $loginRes = Invoke-Json "$Base/auth/login" 'POST' @{ usernameOrEmail = $Username; password = $Password } $null
  $token = $loginRes.token
  $userObj = $loginRes.user
} else {
  Write-Host 'Using token from environment.' -ForegroundColor DarkCyan
  try { $userObj = Invoke-Json "$Base/auth/me" 'GET' $null $token } catch { Write-Warning 'Could not resolve /auth/me (continuing)'; }
}
if (-not $token) { throw 'Failed to obtain token' }

# 2. Resolve user info
if (-not $userObj) {
  # Minimal decode best-effort (JWT second segment)
  if ($token -match '^([^\.]+)\.([^\.]+)\.([^\.]+)$') {
    try { $payload = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($matches[2] + '===').Substring(0, ($matches[2] + '===').Length - ( ($matches[2] + '===' ).Length % 4)))) ; $userObj = ($payload | ConvertFrom-Json) } catch {}
  }
}

$roles = @($userObj.roles)
Write-Host ("User roles: " + ($roles -join ',')) -ForegroundColor DarkGray

# 3. Resolve / choose student
if (-not $StudentId) {
  Write-Host 'Fetching students...' -ForegroundColor DarkCyan
  $studList = @()
  try { $studList = Invoke-Json "$Base/students" 'GET' $null $token } catch { }
  if (-not $studList -or $studList.Count -eq 0) { throw 'No students visible to this account. Provide -StudentId explicitly.' }
  $StudentId = $studList[0].id
  Write-Host "Picked student: $($studList[0].childName) ($StudentId)" -ForegroundColor DarkGray
}

# 4. Resolve teacher
$actingTeacherId = $null
$hasTeacherRole = $roles -contains 'TEACHER'
if ($hasTeacherRole) { $actingTeacherId = $userObj.id }
elseif ($TeacherId) { $actingTeacherId = $TeacherId }
else {
  Write-Host 'Fetching teachers...' -ForegroundColor DarkCyan
  $teachers = @()
  try { $teachers = Invoke-Json "$Base/hr/teachers" 'GET' $null $token } catch { }
  if (-not $teachers -or $teachers.Count -eq 0) { throw 'No teachers found. Provide -TeacherId.' }
  $actingTeacherId = $teachers[0].id
  Write-Host "Picked teacher: $($teachers[0].fullName) ($actingTeacherId)" -ForegroundColor DarkGray
}

# 5. Pre-existence check (avoid duplicates unless -Force)
$existing = @()
try { $existing = Invoke-Json "$Base/student-reports" 'GET' $null $token } catch { }
$match = $existing | Where-Object { $_.studentId -eq $StudentId -and $_.term -eq $Term } | Select-Object -First 1
if ($match -and -not $Force) {
  Write-Host "Report already exists for student=$StudentId term=$Term (id=$($match.id)). Use -Force to create another." -ForegroundColor Yellow
  $match | ConvertTo-Json -Depth 6
  return
}

# 6. Build request
$body = @{
  studentId = $StudentId
  teacherId = $actingTeacherId
  term = $Term
  date = $Date
  comments = $Comments
  improvementPlan = $ImprovementPlan
}

Write-Host 'Creating report...' -ForegroundColor DarkCyan
$newReport = Invoke-Json "$Base/student-reports" 'POST' $body $token
Write-Host "Created report id=$($newReport.id)" -ForegroundColor Green

# 7. Verify presence
$after = @()
try { $after = Invoke-Json "$Base/student-reports" 'GET' $null $token } catch { }
$found = $after | Where-Object { $_.id -eq $newReport.id } | Select-Object -First 1
if ($found) {
  Write-Host 'Verification succeeded. Report present in listing.' -ForegroundColor Green
} else {
  Write-Warning 'Report not found in follow-up listing!' 
}

$newReport | ConvertTo-Json -Depth 6
