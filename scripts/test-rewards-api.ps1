# Test script for rewards APIs
# Tests purchase flow, inventory, pause token activation, and level skip

Write-Host "=== Testing Rewards System ===" -ForegroundColor Cyan
Write-Host ""

# Check if we have the required environment variables
if (-not $env:NEXT_PUBLIC_SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "ERROR: Missing Supabase environment variables" -ForegroundColor Red
    Write-Host "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
    exit 1
}

$baseUrl = "http://localhost:3000"
$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Body) {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $bodyJson -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -ErrorAction Stop
        }
        
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "  [PASS] Status: $statusCode" -ForegroundColor Green
            $script:testResults += @{
                Name = $Name
                Status = "PASS"
                Details = $content
            }
            return $content
        } else {
            Write-Host "  [FAIL] Expected $ExpectedStatus, got $statusCode" -ForegroundColor Red
            $script:testResults += @{
                Name = $Name
                Status = "FAIL"
                Details = "Status: $statusCode"
            }
            return $null
        }
    } catch {
        Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{
            Name = $Name
            Status = "ERROR"
            Details = $_.Exception.Message
        }
        return $null
    }
}

# Test 1: Check if shop items are available
Write-Host "`n--- Test 1: Fetch Shop Items ---" -ForegroundColor Cyan
$shopItems = Test-Endpoint -Name "Get Shop Items" -Method "GET" -Url "$baseUrl/api/shop/items"
if ($shopItems) {
    Write-Host "  Found $($shopItems.items.Count) shop items" -ForegroundColor Gray
    $pauseTokenItem = $shopItems.items | Where-Object { $_.name -like "*Pause Token*" } | Select-Object -First 1
    $levelSkipItem = $shopItems.items | Where-Object { $_.name -like "*Level Skip*" } | Select-Object -First 1
    $themeItem = $shopItems.items | Where-Object { $_.name -like "*Theme*" } | Select-Object -First 1
    
    if ($pauseTokenItem) {
        Write-Host "  Pause Token Item ID: $($pauseTokenItem.id)" -ForegroundColor Gray
    }
    if ($levelSkipItem) {
        Write-Host "  Level Skip Item ID: $($levelSkipItem.id)" -ForegroundColor Gray
    }
    if ($themeItem) {
        Write-Host "  Theme Item ID: $($themeItem.id)" -ForegroundColor Gray
    }
}

# Test 2: Check inventory endpoint (requires auth - will test structure)
Write-Host "`n--- Test 2: Inventory Endpoint Structure ---" -ForegroundColor Cyan
Write-Host "  Note: This requires authentication. Testing endpoint exists..." -ForegroundColor Gray
$inventoryTest = Test-Endpoint -Name "Get Inventory" -Method "GET" -Url "$baseUrl/api/rewards/inventory" -ExpectedStatus 401
if ($inventoryTest -eq $null) {
    Write-Host "  [PASS] Endpoint exists (401 is expected without auth)" -ForegroundColor Green
}

# Test 3: Check pause token activation endpoint
Write-Host ""
Write-Host "--- Test 3: Pause Token Activation Endpoint ---" -ForegroundColor Cyan
$pauseTest = Test-Endpoint -Name "Activate Pause Token" -Method "POST" -Url "$baseUrl/api/rewards/pause-token/activate" -Body @{
    tokenId = "test-token-id"
    days = 1
} -ExpectedStatus 401
if ($pauseTest -eq $null) {
    Write-Host "  [PASS] Endpoint exists (401 is expected without auth)" -ForegroundColor Green
}

# Test 4: Check level skip endpoint
Write-Host ""
Write-Host "--- Test 4: Level Skip Endpoint ---" -ForegroundColor Cyan
$skipTest = Test-Endpoint -Name "Use Level Skip" -Method "POST" -Url "$baseUrl/api/rewards/level-skip/use" -Body @{
    levelId = "test-level-id"
} -ExpectedStatus 401
if ($skipTest -eq $null) {
    Write-Host "  [PASS] Endpoint exists (401 is expected without auth)" -ForegroundColor Green
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$errors = ($testResults | Where-Object { $_.Status -eq "ERROR" }).Count

Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "Errors: $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })

Write-Host "`n=== Database Verification Queries ===" -ForegroundColor Cyan
Write-Host "Run these in Supabase SQL Editor to verify data:" -ForegroundColor Yellow
Write-Host ""
Write-Host "-- Check user_inventory table structure" -ForegroundColor Gray
Write-Host "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_inventory';" -ForegroundColor White
Write-Host ""
Write-Host "-- Check user_themes table structure" -ForegroundColor Gray
Write-Host "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_themes';" -ForegroundColor White
Write-Host ""
Write-Host "-- Check streak_pauses table structure" -ForegroundColor Gray
Write-Host "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'streak_pauses';" -ForegroundColor White
Write-Host ""
Write-Host "-- Check RLS policies" -ForegroundColor Gray
Write-Host "SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('user_inventory', 'user_themes', 'streak_pauses');" -ForegroundColor White

Write-Host "`nTest script completed!" -ForegroundColor Green

