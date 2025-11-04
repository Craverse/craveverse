# Iterative Testing and Fixing Script
# Runs cycles: Clean → Start → Test → Fix → Repeat

$iteration = 1
$maxIterations = 12
$testResults = @()

function Clean-Environment {
    Write-Host "`n=== CLEANING ENVIRONMENT ===" -ForegroundColor Cyan
    Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    if (Test-Path ".next-dev") {
        Remove-Item -Recurse -Force ".next-dev" -ErrorAction SilentlyContinue
        Write-Host "✓ Cleaned .next-dev"
    }
    Write-Host "✓ Environment cleaned"
}

function Start-Server {
    Write-Host "`n=== STARTING SERVER ===" -ForegroundColor Cyan
    $job = Start-Job -ScriptBlock {
        Set-Location "C:\Users\muzam\OneDrive\Desktop\PROJECTS\CraveVerse\craveverse-finale\craveverse-deploy"
        npm run dev 2>&1
    }
    Start-Sleep -Seconds 50
    $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
    Write-Host "Server startup output:" -ForegroundColor Yellow
    $output | Select-Object -Last 10 | ForEach-Object { Write-Host "  $_" }
    return $job
}

function Test-Endpoints {
    Write-Host "`n=== TESTING ENDPOINTS ===" -ForegroundColor Cyan
    $endpoints = @(
        "/api/health",
        "/api/user/profile",
        "/api/shop/items",
        "/api/levels",
        "/api/battles",
        "/api/forum/threads",
        "/api/leaderboard"
    )
    
    $results = @()
    foreach ($endpoint in $endpoints) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:3000$endpoint" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            Write-Host "✓ $endpoint : $($resp.StatusCode)" -ForegroundColor Green
            $results += @{Endpoint=$endpoint; Status=$resp.StatusCode; Success=$true}
        } catch {
            Write-Host "✗ $endpoint : $($_.Exception.Message)" -ForegroundColor Red
            $results += @{Endpoint=$endpoint; Status=""; Success=$false; Error=$_.Exception.Message}
        }
        Start-Sleep -Milliseconds 500
    }
    return $results
}

function Test-Pages {
    Write-Host "`n=== TESTING PAGES ===" -ForegroundColor Cyan
    $pages = @("/", "/dashboard", "/shop", "/forum", "/battles", "/leaderboard")
    $results = @()
    foreach ($page in $pages) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:3000$page" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            Write-Host "✓ $page : $($resp.StatusCode)" -ForegroundColor Green
            $results += @{Page=$page; Status=$resp.StatusCode; Success=$true}
        } catch {
            Write-Host "✗ $page : $($_.Exception.Message)" -ForegroundColor Red
            $results += @{Page=$page; Status=""; Success=$false; Error=$_.Exception.Message}
        }
        Start-Sleep -Milliseconds 500
    }
    return $results
}

# Main loop
while ($iteration -le $maxIterations) {
    Write-Host "`n" + "="*60 -ForegroundColor Magenta
    Write-Host "ITERATION $iteration / $maxIterations" -ForegroundColor Magenta
    Write-Host "="*60 -ForegroundColor Magenta
    
    Clean-Environment
    $job = Start-Server
    
    Start-Sleep -Seconds 5
    $endpointResults = Test-Endpoints
    $pageResults = Test-Pages
    
    $successCount = ($endpointResults | Where-Object {$_.Success -eq $true}).Count
    $totalCount = $endpointResults.Count
    
    Write-Host "`n=== ITERATION $iteration RESULTS ===" -ForegroundColor Cyan
    Write-Host "Endpoints: $successCount / $totalCount successful" -ForegroundColor $(if($successCount -eq $totalCount){"Green"}else{"Yellow"})
    
    $testResults += @{
        Iteration = $iteration
        Timestamp = Get-Date
        EndpointResults = $endpointResults
        PageResults = $pageResults
    }
    
    if ($job) {
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -ErrorAction SilentlyContinue
    }
    
    Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    
    $iteration++
    Start-Sleep -Seconds 2
}

Write-Host "`n=== FINAL SUMMARY ===" -ForegroundColor Magenta
$testResults | ForEach-Object {
    $success = ($_.EndpointResults | Where-Object {$_.Success}).Count
    Write-Host "Iteration $($_.Iteration): $success endpoints successful"
}



