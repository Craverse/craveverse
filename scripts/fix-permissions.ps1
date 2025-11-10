# Fix Windows file permission errors for Next.js
Write-Host "Fixing Next.js file permission errors..."

# Kill all Node processes
Write-Host "Stopping Node processes..."
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove .next directory
Write-Host "Cleaning .next directory..."
if (Test-Path .next) {
    # Try to remove files individually first
    Get-ChildItem .next -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    # Then remove the directory
    Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ .next directory removed"
} else {
    Write-Host "✓ .next directory already clean"
}

# Remove node_modules cache if it exists
if (Test-Path node_modules\.cache) {
    Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Node modules cache cleared"
}

Write-Host "`n✓ Cleanup complete! You can now run 'npm run dev'"
Write-Host ""

