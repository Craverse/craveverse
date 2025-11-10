# Clean and restart Next.js dev server
Write-Host "Cleaning up..."

# Kill Node processes
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait a moment
Start-Sleep -Seconds 2

# Remove .next directory
if (Test-Path .next) {
    Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed .next directory"
}

# Wait a bit more
Start-Sleep -Seconds 1

Write-Host "Starting dev server..."
npm run dev





