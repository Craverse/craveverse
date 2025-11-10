# Continuous Performance Monitoring
# Monitors app performance and alerts on issues

param(
    [int]$IntervalSeconds = 30,
    [int]$TimeoutMinutes = 60,
    [switch]$AlertOnly = $false
)

$ErrorActionPreference = "Continue"
$startTime = Get-Date
$timeout = $startTime.AddMinutes($TimeoutMinutes)

Write-Host "📊 Starting Performance Monitor (Interval: ${IntervalSeconds}s, Timeout: ${TimeoutMinutes}m)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "=" * 60

$metrics = @{
    PageLoads = @()
    APIResponses = @()
    Errors = @()
    StartTime = Get-Date
}

function Test-Endpoint {
    param([string]$Url, [string]$Name)
    
    try {
        $measure = Measure-Command {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        }
        return @{
            Success = $true
            Duration = $measure.TotalSeconds
            StatusCode = $response.StatusCode
        }
    } catch {
        return @{
            Success = $false
            Duration = 0
            Error = $_.Exception.Message
        }
    }
}

$iteration = 0
while ((Get-Date) -lt $timeout) {
    $iteration++
    $now = Get-Date
    
    Write-Host "`n[Iteration $iteration] $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
    
    # Monitor Landing Page
    $landing = Test-Endpoint -Url "http://localhost:3000" -Name "Landing"
    $metrics.PageLoads += $landing
    if ($landing.Success) {
        if ($landing.Duration -gt 2) {
            Write-Host "⚠️ Landing page slow: $($landing.Duration.ToString('F2'))s" -ForegroundColor Yellow
        } elseif (-not $AlertOnly) {
            Write-Host "✅ Landing page: $($landing.Duration.ToString('F2'))s" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Landing page failed: $($landing.Error)" -ForegroundColor Red
        $metrics.Errors += "Landing page: $($landing.Error)"
    }
    
    # Monitor API Health
    $health = Test-Endpoint -Url "http://localhost:3000/api/health" -Name "Health"
    $metrics.APIResponses += $health
    if ($health.Success) {
        if ($health.Duration -gt 0.5) {
            Write-Host "⚠️ API slow: $($health.Duration.ToString('F2'))s" -ForegroundColor Yellow
        } elseif (-not $AlertOnly) {
            Write-Host "✅ API health: $($health.Duration.ToString('F2'))s" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ API failed: $($health.Error)" -ForegroundColor Red
        $metrics.Errors += "API health: $($health.Error)"
    }
    
    # Monitor User Profile API
    $profile = Test-Endpoint -Url "http://localhost:3000/api/user/profile" -Name "Profile"
    $metrics.APIResponses += $profile
    if ($profile.Success) {
        if ($profile.Duration -gt 1) {
            Write-Host "⚠️ Profile API slow: $($profile.Duration.ToString('F2'))s" -ForegroundColor Yellow
        } elseif (-not $AlertOnly) {
            Write-Host "✅ Profile API: $($profile.Duration.ToString('F2'))s" -ForegroundColor Green
        }
    } elseif ($profile.StatusCode -ne 401) {
        # 401 is expected (not authenticated)
        Write-Host "⚠️ Profile API: Status $($profile.StatusCode)" -ForegroundColor Yellow
    }
    
    # Calculate and display averages
    if ($iteration % 10 -eq 0) {
        $avgPageLoad = ($metrics.PageLoads | Where-Object { $_.Success } | Measure-Object -Property Duration -Average).Average
        $avgAPI = ($metrics.APIResponses | Where-Object { $_.Success } | Measure-Object -Property Duration -Average).Average
        $errorRate = ($metrics.Errors.Count / ($metrics.PageLoads.Count + $metrics.APIResponses.Count)) * 100
        
        Write-Host "`n📊 Statistics (Last 10 iterations):" -ForegroundColor Cyan
        Write-Host "   Avg Page Load: $($avgPageLoad.ToString('F2'))s" -ForegroundColor $(if ($avgPageLoad -gt 2) { "Yellow" } else { "Green" })
        Write-Host "   Avg API Response: $($avgAPI.ToString('F2'))s" -ForegroundColor $(if ($avgAPI -gt 0.5) { "Yellow" } else { "Green" })
        Write-Host "   Error Rate: $($errorRate.ToString('F1'))%" -ForegroundColor $(if ($errorRate -gt 5) { "Red" } else { "Green" })
    }
    
    # Wait for next interval
    Start-Sleep -Seconds $IntervalSeconds
}

# Final Summary
$elapsed = (Get-Date) - $startTime
Write-Host "`n" + "=" * 60
Write-Host "📊 Final Monitoring Summary" -ForegroundColor Cyan
Write-Host "   Duration: $($elapsed.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Gray
Write-Host "   Iterations: $iteration" -ForegroundColor Gray

$avgPageLoad = ($metrics.PageLoads | Where-Object { $_.Success } | Measure-Object -Property Duration -Average).Average
$avgAPI = ($metrics.APIResponses | Where-Object { $_.Success } | Measure-Object -Property Duration -Average).Average
$errorCount = $metrics.Errors.Count

Write-Host "   Avg Page Load: $($avgPageLoad.ToString('F2'))s" -ForegroundColor $(if ($avgPageLoad -gt 2) { "Yellow" } else { "Green" })
Write-Host "   Avg API Response: $($avgAPI.ToString('F2'))s" -ForegroundColor $(if ($avgAPI -gt 0.5) { "Yellow" } else { "Green" })
Write-Host "   Total Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host "=" * 60





