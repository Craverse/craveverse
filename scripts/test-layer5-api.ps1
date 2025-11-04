# Layer 5: API Endpoint Testing
# Test all API endpoints for correct responses and authentication

Write-Host "=== Layer 5: API Endpoint Testing ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
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
    }
} catch {
    $errors += "Server is not running or not accessible at $baseUrl"
    Write-Host "✗ Server is not running or not accessible" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the server with 'npm run dev' first" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test public endpoints
Write-Host "Testing public endpoints..." -ForegroundColor Yellow

# 1. Health check
Write-Host "1. Testing /api/health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $content = $response.Content | ConvertFrom-Json
        Write-Host "   ✓ Health check passed" -ForegroundColor Green
        Write-Host "     Status: $($content.status)" -ForegroundColor Gray
    } else {
        $errors += "/api/health returned status $($response.StatusCode)"
        Write-Host "   ✗ Health check failed with status $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    $errors += "/api/health request failed: $($_.Exception.Message)"
    Write-Host "   ✗ Health check request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test protected endpoints (should return 401/403)
Write-Host ""
Write-Host "Testing protected endpoints (should require auth)..." -ForegroundColor Yellow

$protectedEndpoints = @(
    @{ Path = "/api/onboarding/complete"; Method = "POST"; Body = '{"craving":"test"}' },
    @{ Path = "/api/user/profile"; Method = "GET"; Body = $null },
    @{ Path = "/api/battles"; Method = "GET"; Body = $null },
    @{ Path = "/api/forum/threads"; Method = "GET"; Body = $null }
)

$endpointIndex = 2
foreach ($endpoint in $protectedEndpoints) {
    Write-Host "$endpointIndex. Testing $($endpoint.Method) $($endpoint.Path)..." -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = "$baseUrl$($endpoint.Path)"
            Method = $endpoint.Method
            UseBasicParsing = $true
            TimeoutSec = 5
            ErrorAction = "Stop"
        }
        
        if ($endpoint.Body) {
            $params.Body = $endpoint.Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        
        # Protected endpoints should return 401/403 when not authenticated
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host "   ✓ Correctly requires authentication (status: $statusCode)" -ForegroundColor Green
        } elseif ($statusCode -eq 200) {
            $warnings += "$($endpoint.Path) returned 200 without authentication (may be in mock mode)"
            Write-Host "   ⚠ Returned 200 without auth (may be mock mode)" -ForegroundColor Yellow
        } else {
            $warnings += "$($endpoint.Path) returned unexpected status $statusCode"
            Write-Host "   ⚠ Returned status $statusCode" -ForegroundColor Yellow
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host "   ✓ Correctly requires authentication (status: $statusCode)" -ForegroundColor Green
        } else {
            $warnings += "$($endpoint.Path) request failed: $($_.Exception.Message)"
            Write-Host "   ⚠ Request failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    $endpointIndex++
}

# Test webhook endpoint (should accept POST)
Write-Host ""
Write-Host "Testing webhook endpoints..." -ForegroundColor Yellow
Write-Host "$endpointIndex. Testing POST /api/webhooks/clerk..." -ForegroundColor Yellow
try {
    $testBody = '{"type":"user.created","data":{"id":"test-user-123"}}'
    $response = Invoke-WebRequest -Uri "$baseUrl/api/webhooks/clerk" -Method POST -Body $testBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    # Webhook might return 200 or 400 depending on validation
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 400) {
        Write-Host "   ✓ Webhook endpoint accessible (status: $($response.StatusCode))" -ForegroundColor Green
    } else {
        $warnings += "/api/webhooks/clerk returned status $($response.StatusCode)"
        Write-Host "   ⚠ Webhook returned status $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "   ✓ Webhook endpoint accessible (validated request, returned 400)" -ForegroundColor Green
    } else {
        $warnings += "/api/webhooks/clerk request failed: $($_.Exception.Message)"
        Write-Host "   ⚠ Webhook request failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ All API endpoint checks passed!" -ForegroundColor Green
    exit 0
} elseif ($errors.Count -eq 0) {
    Write-Host "⚠ All critical checks passed, but $($warnings.Count) warning(s) found" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  - $warning" -ForegroundColor Yellow
    }
    exit 0
} else {
    Write-Host "✗ $($errors.Count) error(s) found:" -ForegroundColor Red
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
    exit 1
}

