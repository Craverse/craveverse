# Error Detection Script for CraveVerse
Write-Host "=== CraveVerse Error Checker ===" -ForegroundColor Cyan

# Check for missing dependencies
Write-Host "`n1. Checking dependencies..." -ForegroundColor Yellow
$missing = npm list --depth=0 2>&1 | Select-String -Pattern "UNMET|missing|ERR!"
if ($missing) {
    Write-Host "   ❌ Missing dependencies detected!" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
} else {
    Write-Host "   ✅ All dependencies installed" -ForegroundColor Green
}

# Check for TypeScript errors
Write-Host "`n2. Checking TypeScript..." -ForegroundColor Yellow
$tsErrors = npm run type-check 2>&1 | Select-String -Pattern "error TS|Cannot find|Module not found"
if ($tsErrors) {
    Write-Host "   ❌ TypeScript errors found!" -ForegroundColor Red
    $tsErrors | Select-Object -First 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
} else {
    Write-Host "   ✅ No TypeScript errors" -ForegroundColor Green
}

# Check for .env file
Write-Host "`n3. Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .env file missing (will use mock mode)" -ForegroundColor Yellow
}

# Check for node_modules
Write-Host "`n4. Checking node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ node_modules missing! Run: npm install" -ForegroundColor Red
}

# Check for port conflicts
Write-Host "`n5. Checking port 3000..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "   ⚠️  Port 3000 is in use" -ForegroundColor Yellow
    Write-Host "   Run: Get-Process | Where-Object {`$_.ProcessName -like '*node*'} | Stop-Process -Force" -ForegroundColor Cyan
} else {
    Write-Host "   ✅ Port 3000 is available" -ForegroundColor Green
}

Write-Host "`n=== Check Complete ===" -ForegroundColor Cyan
