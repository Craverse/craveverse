# Layer 6: Runtime Error Monitoring
# Monitor terminal and browser for runtime errors during development

Write-Host "=== Layer 6: Runtime Error Monitoring ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will monitor the dev server for runtime errors." -ForegroundColor Yellow
Write-Host "Make sure the dev server is running in another terminal." -ForegroundColor Yellow
Write-Host ""

$baseUrl = "http://localhost:3000"
$monitoringDuration = 60 # seconds
$checkInterval = 5 # seconds
$errors = @()
$warnings = @()

# Check if server is running
Write-Host "Checking if server is running..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "✓ Server is running" -ForegroundColor Green
    } else {
        $errors += "Server returned status code $($healthCheck.StatusCode)"
        Write-Host "✗ Server returned status code $($healthCheck.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    $errors += "Server is not running or not accessible"
    Write-Host "✗ Server is not running or not accessible" -ForegroundColor Red
    Write-Host "  Please start the server with 'npm run dev' first" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Monitoring for $monitoringDuration seconds..." -ForegroundColor Cyan
Write-Host "Check your browser console for client-side errors." -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date
$checkCount = 0
$errorCount = 0

while (((Get-Date) - $startTime).TotalSeconds -lt $monitoringDuration) {
    $checkCount++
    $elapsed = [int]((Get-Date) - $startTime).TotalSeconds
    
    Write-Host "[$elapsed/$monitoringDuration] Checking server health..." -ForegroundColor Gray
    
    try {
        # Check server health
        $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        
        if ($response.StatusCode -ne 200) {
            $errorCount++
            $warnings += "Server health check returned status $($response.StatusCode) at $elapsed seconds"
            Write-Host "  ⚠ Health check returned status $($response.StatusCode)" -ForegroundColor Yellow
        }
        
        # Check main page loads
        try {
            $pageResponse = Invoke-WebRequest -Uri "$baseUrl" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            if ($pageResponse.StatusCode -ne 200) {
                $errorCount++
                $warnings += "Landing page returned status $($pageResponse.StatusCode) at $elapsed seconds"
                Write-Host "  ⚠ Landing page returned status $($pageResponse.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            $errorCount++
            $warnings += "Landing page failed to load at $elapsed seconds: $($_.Exception.Message)"
            Write-Host "  ⚠ Landing page failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
    } catch {
        $errorCount++
        $errors += "Server health check failed at $elapsed seconds: $($_.Exception.Message)"
        Write-Host "  ✗ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $checkInterval
}

Write-Host ""
Write-Host "=== Monitoring Complete ===" -ForegroundColor Cyan
Write-Host "Performed $checkCount health checks" -ForegroundColor Gray

# Check for common runtime issues
Write-Host ""
Write-Host "Checking for common runtime issues..." -ForegroundColor Yellow

# Check if .next directory exists (indicates successful compilation)
if (Test-Path ".next") {
    Write-Host "✓ .next directory exists (build successful)" -ForegroundColor Green
} else {
    $warnings += ".next directory not found (may need to build)"
    Write-Host "⚠ .next directory not found" -ForegroundColor Yellow
}

# Check for common error patterns in terminal
Write-Host ""
Write-Host "Manual checks to perform:" -ForegroundColor Yellow
Write-Host "1. Check browser console for JavaScript errors" -ForegroundColor White
Write-Host "2. Check terminal output for React errors" -ForegroundColor White
Write-Host "3. Check terminal output for API errors (500, 400)" -ForegroundColor White
Write-Host "4. Test navigation between pages" -ForegroundColor White
Write-Host "5. Test authentication flow" -ForegroundColor White
Write-Host "6. Check for infinite loops in useEffect hooks" -ForegroundColor White
Write-Host "7. Verify Clerk provider is working" -ForegroundColor White
Write-Host "8. Verify Supabase client is working" -ForegroundColor White

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($errors.Count -eq 0 -and $errorCount -eq 0) {
    Write-Host "✓ No runtime errors detected during monitoring!" -ForegroundColor Green
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠ $($warnings.Count) warning(s):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
    exit 0
} else {
    Write-Host "✗ $($errors.Count + $errorCount) error(s) detected:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠ $($warnings.Count) warning(s):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  - Terminal output for detailed error messages" -ForegroundColor White
    Write-Host "  - Browser console for client-side errors" -ForegroundColor White
    Write-Host "  - Network tab for failed API requests" -ForegroundColor White
    exit 1
}

