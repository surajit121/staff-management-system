# ============================================
#   StaffSync Pro - Quick Push Script
#   Run this anytime you update the app!
# ============================================

$git = "C:\Program Files\Git\bin\git.exe"

# Ask for a commit message
$msg = Read-Host "Enter commit message (e.g. 'Fixed attendance bug')"

if ([string]::IsNullOrWhiteSpace($msg)) {
    $msg = "Updated StaffSync Pro - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host ""
Write-Host ">> Staging all changes..." -ForegroundColor Cyan
& $git add .

Write-Host ">> Committing: $msg" -ForegroundColor Cyan
& $git commit -m $msg

Write-Host ">> Pushing to GitHub..." -ForegroundColor Cyan
& $git push origin main

Write-Host ""
Write-Host "SUCCESS! Code pushed to GitHub!" -ForegroundColor Green
Write-Host "https://github.com/surajit121/staff-management-system" -ForegroundColor Yellow
