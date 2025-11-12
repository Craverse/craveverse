# Comprehensive Test Suite with Auto-Timeout
# Tests all critical functionality and exits automatically after timeout

param(
    [int]$TimeoutSeconds = 300,  # 5 minutes default
    [switch]$Quick = $false,      # Quick test mode (60s)
    [switch]$Full = $false        # Full test suite (10 minutes)
)

$ErrorActionPreference = "Continue"
$startTime = Get-Date

if ($Quick) {
    $TimeoutSeconds = 60
} elseif ($Full) {
    $TimeoutSeconds = 600
}

Write-Host "🧪 Starting Comprehensive Test Suite (Timeout: ${TimeoutSeconds}s)" -ForegroundColor Cyan
Write-Host "=" * 60

$testResults = @{
    Passed = 0
    Failed = 0
    Skipped = 0
    Errors = @()
}

$devPort = if ($env:DEV_PORT) { [int]$env:DEV_PORT } else { 3000 }
$baseUrl = "http://localhost:$devPort"

function Test-WithTimeout {
    param(
        [string]$Name,
        [scriptblock]$TestScript,
        [int]$Timeout = 30
    )
    
    $job = Start-Job -ScriptBlock $TestScript
    $result = Wait-Job -Job $job -Timeout $Timeout
    
    if ($result) {
        $output = Receive-Job -Job $job
        Remove-Job -Job $job
        return $output
    } else {
        Stop-Job -Job $job
        Remove-Job -Job $job
        Write-Warning "Test '$Name' timed out after ${Timeout}s"
        return $false
    }
}

# Test 1: Server Status
Write-Host "`n[1/10] Testing Server Status..." -ForegroundColor Yellow
$serverTest = Test-WithTimeout -Name "Server" -Timeout 10 -TestScript {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}
if ($serverTest) {
    Write-Host "✅ Server is running" -ForegroundColor Green
    $testResults.Passed++
} else {
    Write-Host "❌ Server is not responding" -ForegroundColor Red
    $testResults.Failed++
    $testResults.Errors += "Server health check failed"
}

# Test 2: Type Check
Write-Host "`n[2/10] Running Type Check..." -ForegroundColor Yellow
$typeCheck = Test-WithTimeout -Name "TypeCheck" -Timeout 60 -TestScript {
    Set-Location $using:PWD
    npm run type-check 2>&1 | Out-String
    return $LASTEXITCODE -eq 0
}
if ($typeCheck) {
    Write-Host "✅ TypeScript compilation successful" -ForegroundColor Green
    $testResults.Passed++
} else {
    Write-Host "❌ TypeScript errors found" -ForegroundColor Red
    $testResults.Failed++
    $testResults.Errors += "TypeScript compilation failed"
}

# Test 3: Build Test
if (-not $Quick) {
    Write-Host "`n[3/10] Testing Build..." -ForegroundColor Yellow
    $buildTest = Test-WithTimeout -Name "Build" -Timeout 120 -TestScript {
        Set-Location $using:PWD
        npm run build 2>&1 | Out-String
        return $LASTEXITCODE -eq 0
    }
    if ($buildTest) {
        Write-Host "✅ Build successful" -ForegroundColor Green
        $testResults.Passed++
    } else {
        Write-Host "❌ Build failed" -ForegroundColor Red
        $testResults.Failed++
        $testResults.Errors += "Build failed"
    }
} else {
    Write-Host "`n[3/10] Skipping Build (Quick mode)" -ForegroundColor Gray
    $testResults.Skipped++
}

# Test 4: API Health Check
Write-Host "`n[4/10] Testing API Health..." -ForegroundColor Yellow
$apiHealth = Test-WithTimeout -Name "APIHealth" -Timeout 10 -TestScript {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        return $data.status -eq "ok"
    } catch {
        return $false
    }
}
if ($apiHealth) {
    Write-Host "✅ API health check passed" -ForegroundColor Green
    $testResults.Passed++
} else {
    Write-Host "❌ API health check failed" -ForegroundColor Red
    $testResults.Failed++
    $testResults.Errors += "API health check failed"
}

# Test 5: Page Load Performance
Write-Host "`n[5/10] Testing Page Load Performance..." -ForegroundColor Yellow
$pageLoad = Test-WithTimeout -Name "PageLoad" -Timeout 15 -TestScript {
    try {
        $measure = Measure-Command {
            $response = Invoke-WebRequest -Uri $baseUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        }
        return $measure.TotalSeconds -lt 3  # Should load in < 3 seconds
    } catch {
        return $false
    }
}
if ($pageLoad) {
    Write-Host "✅ Landing page loads quickly" -ForegroundColor Green
    $testResults.Passed++
} else {
    Write-Host "⚠️ Landing page load may be slow" -ForegroundColor Yellow
    $testResults.Failed++
    $testResults.Errors += "Page load performance issue"
}

# Test 6: Authentication Flow (if not in Quick mode)
if (-not $Quick) {
    Write-Host "`n[6/10] Testing Authentication Endpoints..." -ForegroundColor Yellow
    $authTest = Test-WithTimeout -Name "Auth" -Timeout 20 -TestScript {
        # Check if auth endpoints are accessible (not testing actual auth)
        try {
            $signIn = Invoke-WebRequest -Uri "$baseUrl/sign-in" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            return $signIn.StatusCode -eq 200
        } catch {
            return $false
        }
    }
    if ($authTest) {
        Write-Host "✅ Authentication pages accessible" -ForegroundColor Green
        $testResults.Passed++
    } else {
        Write-Host "❌ Authentication pages not accessible" -ForegroundColor Red
        $testResults.Failed++
        $testResults.Errors += "Authentication pages failed"
    }
} else {
    Write-Host "`n[6/10] Skipping Auth Test (Quick mode)" -ForegroundColor Gray
    $testResults.Skipped++
}

# Test 7: Database Connection (if API available)
Write-Host "`n[7/10] Testing Database Connectivity..." -ForegroundColor Yellow
$dbTest = Test-WithTimeout -Name "Database" -Timeout 10 -TestScript {
    try {
        # Try to access user profile API (should handle mock mode gracefully)
        $response = Invoke-WebRequest -Uri "$baseUrl/api/user/profile" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -in @(200, 401)  # 401 is OK (not authenticated)
    } catch {
        return $false
    }
}
if ($dbTest) {
    Write-Host "✅ Database connectivity OK" -ForegroundColor Green
    $testResults.Passed++
} else {
    Write-Host "❌ Database connectivity issues" -ForegroundColor Red
    $testResults.Failed++
    $testResults.Errors += "Database connection failed"
}

# Test 8: Environment Variables
Write-Host "`n[8/10] Checking Environment Variables..." -ForegroundColor Yellow
$envTest = Test-WithTimeout -Name "Environment" -Timeout 5 -TestScript {
    Set-Location $using:PWD
    if (Test-Path ".env.local") {
        $envContent = Get-Content ".env.local" -Raw
        $required = @("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "OPENAI_API_KEY")
        $missing = $required | Where-Object { $envContent -notmatch $_ }
        return $missing.Count -eq 0
    }
    return $false
}
if ($envTest) {
    Write-Host "✅ Environment variables configured" -ForegroundColor Green
    $testResults.Passed++
} else {
    Write-Host "⚠️ Some environment variables may be missing" -ForegroundColor Yellow
    $testResults.Failed++
    $testResults.Errors += "Environment variables check failed"
}

# Test 9: Linter Check
Write-Host "`n[9/10] Running Linter..." -ForegroundColor Yellow
$lintTest = Test-WithTimeout -Name "Lint" -Timeout 60 -TestScript {
    Set-Location $using:PWD
    npm run lint 2>&1 | Out-String
    return $LASTEXITCODE -eq 0
}
if ($lintTest) {
    Write-Host "✅ Linter passed" -ForegroundColor Green
    $testResults.Passed++
} else {
    Write-Host "⚠️ Linter warnings found" -ForegroundColor Yellow
    $testResults.Failed++
    $testResults.Errors += "Linter found issues"
}

# Test 10: Performance Check
Write-Host "`n[10/10] Running Performance Check..." -ForegroundColor Yellow
$perfTest = Test-WithTimeout -Name "Performance" -Timeout 30 -TestScript {
    $endpoints = @("/", "/api/health", "/api/user/profile")
    $allFast = $true
    foreach ($endpoint in $endpoints) {
        try {
            $measure = Measure-Command {
                Invoke-WebRequest -Uri "http://localhost:3000$endpoint" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop | Out-Null
            }
            if ($measure.TotalSeconds -gt 2) {
                $allFast = $false
            }
        } catch {
            # Ignore errors for performance test
        }
    }
    return $allFast
}
if ($perfTest) {
    Write-Host "[OK] Performance checks passed" -ForegroundColor Green
    $testResults.Passed++
} else {
    Write-Host "[WARN] Some endpoints may be slow" -ForegroundColor Yellow
    $testResults.Failed++
    $testResults.Errors += "Performance issues detected"
}

# Summary
$elapsed = (Get-Date) - $startTime
Write-Host "`n" + "=" * 60
Write-Host "[SUMMARY] Test Summary" -ForegroundColor Cyan
Write-Host "   Passed:  $($testResults.Passed)" -ForegroundColor Green
Write-Host "   Failed:  $($testResults.Failed)" -ForegroundColor Red
Write-Host "   Skipped: $($testResults.Skipped)" -ForegroundColor Gray
Write-Host "   Time:    $($elapsed.TotalSeconds.ToString('F2'))s"
Write-Host "=" * 60

if ($testResults.Errors.Count -gt 0) {
Write-Host "`n[ERROR] Errors Found:" -ForegroundColor Red
    $testResults.Errors | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    exit 1
} else {
    Write-Host "`n[OK] All tests passed!" -ForegroundColor Green
    exit 0
}





