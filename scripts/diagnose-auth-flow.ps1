# Comprehensive Auth Flow Diagnostics
# Check Clerk configuration, Supabase configuration, and auth flow health

Write-Host "=== Auth Flow Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Check Clerk configuration
Write-Host "1. Checking Clerk configuration..." -ForegroundColor Yellow
$clerkPublishableKey = $env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
$clerkSecretKey = $env:CLERK_SECRET_KEY

if (-not $clerkPublishableKey) {
    $clerkPublishableKey = (Get-Content ".env.local" -ErrorAction SilentlyContinue | Select-String "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" | ForEach-Object { ($_ -split "=")[1].Trim() })
}

if (-not $clerkSecretKey) {
    $clerkSecretKey = (Get-Content ".env.local" -ErrorAction SilentlyContinue | Select-String "CLERK_SECRET_KEY" | ForEach-Object { ($_ -split "=")[1].Trim() })
}

if ($clerkPublishableKey -and $clerkPublishableKey -notmatch "pk_test_|pk_live_") {
    $warnings += "Clerk publishable key format may be incorrect"
    Write-Host "   ⚠ Clerk publishable key format may be incorrect" -ForegroundColor Yellow
} elseif ($clerkPublishableKey) {
    Write-Host "   ✓ Clerk publishable key is set" -ForegroundColor Green
} else {
    $errors += "Clerk publishable key not found"
    Write-Host "   ✗ Clerk publishable key not found" -ForegroundColor Red
}

if ($clerkSecretKey -and $clerkSecretKey -notmatch "sk_test_|sk_live_") {
    $warnings += "Clerk secret key format may be incorrect"
    Write-Host "   ⚠ Clerk secret key format may be incorrect" -ForegroundColor Yellow
} elseif ($clerkSecretKey) {
    Write-Host "   ✓ Clerk secret key is set" -ForegroundColor Green
} else {
    $errors += "Clerk secret key not found"
    Write-Host "   ✗ Clerk secret key not found" -ForegroundColor Red
}

# Check Supabase configuration
Write-Host ""
Write-Host "2. Checking Supabase configuration..." -ForegroundColor Yellow
$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$supabaseAnonKey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
$supabaseServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl) {
    $supabaseUrl = (Get-Content ".env.local" -ErrorAction SilentlyContinue | Select-String "NEXT_PUBLIC_SUPABASE_URL" | ForEach-Object { ($_ -split "=")[1].Trim() })
}

if (-not $supabaseAnonKey) {
    $supabaseAnonKey = (Get-Content ".env.local" -ErrorAction SilentlyContinue | Select-String "NEXT_PUBLIC_SUPABASE_ANON_KEY" | ForEach-Object { ($_ -split "=")[1].Trim() })
}

if (-not $supabaseServiceKey) {
    $supabaseServiceKey = (Get-Content ".env.local" -ErrorAction SilentlyContinue | Select-String "SUPABASE_SERVICE_ROLE_KEY" | ForEach-Object { ($_ -split "=")[1].Trim() })
}

if ($supabaseUrl -and $supabaseUrl -match "https://.*\.supabase\.co") {
    Write-Host "   ✓ Supabase URL is set and valid" -ForegroundColor Green
} elseif ($supabaseUrl -and ($supabaseUrl -match "placeholder|your-project")) {
    $warnings += "Supabase URL appears to be a placeholder"
    Write-Host "   ⚠ Supabase URL is a placeholder (mock mode)" -ForegroundColor Yellow
} elseif ($supabaseUrl) {
    $warnings += "Supabase URL format may be incorrect"
    Write-Host "   ⚠ Supabase URL format may be incorrect" -ForegroundColor Yellow
} else {
    $errors += "Supabase URL not found"
    Write-Host "   ✗ Supabase URL not found" -ForegroundColor Red
}

if ($supabaseAnonKey -and $supabaseAnonKey.Length -gt 50) {
    Write-Host "   ✓ Supabase anon key is set" -ForegroundColor Green
} elseif ($supabaseAnonKey -and ($supabaseAnonKey -match "placeholder")) {
    $warnings += "Supabase anon key is a placeholder"
    Write-Host "   ⚠ Supabase anon key is a placeholder (mock mode)" -ForegroundColor Yellow
} else {
    $errors += "Supabase anon key not found"
    Write-Host "   ✗ Supabase anon key not found" -ForegroundColor Red
}

if ($supabaseServiceKey -and $supabaseServiceKey.Length -gt 50) {
    Write-Host "   ✓ Supabase service role key is set" -ForegroundColor Green
} elseif ($supabaseServiceKey -and ($supabaseServiceKey -match "placeholder")) {
    $warnings += "Supabase service role key is a placeholder"
    Write-Host "   ⚠ Supabase service role key is a placeholder (mock mode)" -ForegroundColor Yellow
} else {
    $errors += "Supabase service role key not found"
    Write-Host "   ✗ Supabase service role key not found" -ForegroundColor Red
}

# Check middleware file
Write-Host ""
Write-Host "3. Checking middleware configuration..." -ForegroundColor Yellow
if (Test-Path "middleware.ts") {
    $middlewareContent = Get-Content "middleware.ts" -Raw
    if ($middlewareContent -match "clerkMiddleware") {
        Write-Host "   ✓ Middleware file exists and uses clerkMiddleware" -ForegroundColor Green
    } else {
        $warnings += "Middleware file exists but may not be using clerkMiddleware"
        Write-Host "   ⚠ Middleware may not be configured correctly" -ForegroundColor Yellow
    }
} else {
    $errors += "Middleware file not found"
    Write-Host "   ✗ Middleware file not found" -ForegroundColor Red
}

# Check auth components
Write-Host ""
Write-Host "4. Checking auth components..." -ForegroundColor Yellow
$authComponents = @(
    "components/auth-gate.tsx",
    "components/auth-guard.tsx",
    "app/sign-up/[[...sign-up]]/page.tsx",
    "app/sign-in/[[...sign-in]]/page.tsx"
)

foreach ($component in $authComponents) {
    if (Test-Path $component) {
        Write-Host "   ✓ $component exists" -ForegroundColor Green
    } else {
        $warnings += "$component not found"
        Write-Host "   ⚠ $component not found" -ForegroundColor Yellow
    }
}

# Check for redirect URLs in signup page
Write-Host ""
Write-Host "5. Checking signup redirect configuration..." -ForegroundColor Yellow
if (Test-Path "app/sign-up/[[...sign-up]]/page.tsx") {
    $signupContent = Get-Content "app/sign-up/[[...sign-up]]/page.tsx" -Raw
    if ($signupContent -match "afterSignUpUrl") {
        Write-Host "   ✓ Signup page has redirect URL configured" -ForegroundColor Green
    } else {
        $warnings += "Signup page may not have redirect URLs configured"
        Write-Host "   ⚠ Signup page may not have redirect URLs" -ForegroundColor Yellow
    }
} else {
    $errors += "Signup page not found"
    Write-Host "   ✗ Signup page not found" -ForegroundColor Red
}

# Check landing page auth check
Write-Host ""
Write-Host "6. Checking landing page auth check..." -ForegroundColor Yellow
if (Test-Path "app/page.tsx") {
    $landingContent = Get-Content "app/page.tsx" -Raw
    if ($landingContent -match "useUser|useUserContext") {
        Write-Host "   ✓ Landing page has auth check" -ForegroundColor Green
    } else {
        $warnings += "Landing page may not have auth check"
        Write-Host "   ⚠ Landing page may not have auth check" -ForegroundColor Yellow
    }
} else {
    $errors += "Landing page not found"
    Write-Host "   ✗ Landing page not found" -ForegroundColor Red
}

# Test API connectivity (if server is running)
Write-Host ""
Write-Host "7. Testing API connectivity..." -ForegroundColor Yellow
$baseUrl = "http://localhost:3000"
try {
    $healthCheck = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "   ✓ Server is running and API is accessible" -ForegroundColor Green
    } else {
        $warnings += "Server returned status code $($healthCheck.StatusCode)"
        Write-Host "   ⚠ Server returned status code $($healthCheck.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    $warnings += "Server is not running or not accessible"
    Write-Host "   ⚠ Server is not running (start with 'npm run dev')" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ All auth flow checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Test signup flow: Landing -> Signup -> Onboarding" -ForegroundColor White
    Write-Host "2. Test sign-in flow: Sign-in -> Dashboard/Onboarding" -ForegroundColor White
    Write-Host "3. Verify redirects work correctly" -ForegroundColor White
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
    Write-Host ""
    Write-Host "Fix the errors above before testing the auth flow." -ForegroundColor Yellow
    exit 1
}

