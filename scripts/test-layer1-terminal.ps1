# Layer 1: Terminal & Build Validation
# Comprehensive checks for build environment, dependencies, and compilation

Write-Host "=== Layer 1: Terminal & Build Validation ===" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Check Node.js version
Write-Host "1. Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($nodeVersion) {
    $version = [version]($nodeVersion -replace 'v', '')
    $requiredVersion = [version]"18.0.0"
    if ($version -ge $requiredVersion) {
        Write-Host "   ✓ Node.js $nodeVersion (>= 18.0.0 required)" -ForegroundColor Green
    } else {
        $errors += "Node.js version $nodeVersion is below required 18.0.0"
        Write-Host "   ✗ Node.js $nodeVersion is below required 18.0.0" -ForegroundColor Red
    }
} else {
    $errors += "Node.js not found"
    Write-Host "   ✗ Node.js not found" -ForegroundColor Red
}

# Check npm version
Write-Host "2. Checking npm version..." -ForegroundColor Yellow
$npmVersion = npm --version
if ($npmVersion) {
    $version = [version]$npmVersion
    $requiredVersion = [version]"8.0.0"
    if ($version -ge $requiredVersion) {
        Write-Host "   ✓ npm $npmVersion (>= 8.0.0 required)" -ForegroundColor Green
    } else {
        $warnings += "npm version $npmVersion is below recommended 8.0.0"
        Write-Host "   ⚠ npm $npmVersion (>= 8.0.0 recommended)" -ForegroundColor Yellow
    }
} else {
    $errors += "npm not found"
    Write-Host "   ✗ npm not found" -ForegroundColor Red
}

# Check if node_modules exists
Write-Host "3. Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✓ node_modules directory exists" -ForegroundColor Green
    
    # Check for critical dependencies
    $criticalDeps = @("next", "react", "react-dom", "@clerk/nextjs", "@supabase/supabase-js")
    $missingDeps = @()
    foreach ($dep in $criticalDeps) {
        if (-not (Test-Path "node_modules/$dep")) {
            $missingDeps += $dep
        }
    }
    
    if ($missingDeps.Count -eq 0) {
        Write-Host "   ✓ All critical dependencies installed" -ForegroundColor Green
    } else {
        $errors += "Missing critical dependencies: $($missingDeps -join ', ')"
        Write-Host "   ✗ Missing dependencies: $($missingDeps -join ', ')" -ForegroundColor Red
    }
} else {
    $errors += "node_modules directory not found"
    Write-Host "   ✗ node_modules directory not found - run 'npm install'" -ForegroundColor Red
}

# Check environment variables
Write-Host "4. Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✓ .env.local file exists" -ForegroundColor Green
    
    # Load env file and check for critical vars
    $envContent = Get-Content ".env.local" | Where-Object { $_ -match "^[^#]" -and $_ -match "=" }
    $requiredVars = @(
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        $found = $envContent | Where-Object { $_ -match "$var\s*=" }
        if (-not $found) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -eq 0) {
        Write-Host "   ✓ All critical environment variables present" -ForegroundColor Green
    } else {
        $warnings += "Missing environment variables: $($missingVars -join ', ')"
        Write-Host "   ⚠ Missing variables: $($missingVars -join ', ')" -ForegroundColor Yellow
    }
} else {
    $warnings += ".env.local file not found"
    Write-Host "   ⚠ .env.local file not found (using defaults or mock mode)" -ForegroundColor Yellow
}

# Check port availability
Write-Host "5. Checking port availability..." -ForegroundColor Yellow
$ports = @(3000, 5432)
foreach ($port in $ports) {
    $listener = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($listener) {
        $warnings += "Port $port is already in use"
        Write-Host "   ⚠ Port $port is already in use" -ForegroundColor Yellow
    } else {
        Write-Host "   ✓ Port $port is available" -ForegroundColor Green
    }
}

# Run TypeScript compilation check
Write-Host "6. Running TypeScript compilation check..." -ForegroundColor Yellow
try {
    $tscOutput = npm run type-check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ TypeScript compilation successful" -ForegroundColor Green
    } else {
        $errors += "TypeScript compilation failed"
        Write-Host "   ✗ TypeScript compilation failed" -ForegroundColor Red
        Write-Host "   $tscOutput" -ForegroundColor Red
    }
} catch {
    $errors += "TypeScript check failed: $($_.Exception.Message)"
    Write-Host "   ✗ TypeScript check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Run ESLint check
Write-Host "7. Running ESLint check..." -ForegroundColor Yellow
try {
    $lintOutput = npm run lint 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ ESLint check passed" -ForegroundColor Green
    } else {
        $warnings += "ESLint found issues (non-blocking)"
        Write-Host "   ⚠ ESLint found issues (check output above)" -ForegroundColor Yellow
    }
} catch {
    $warnings += "ESLint check failed: $($_.Exception.Message)"
    Write-Host "   ⚠ ESLint check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test build process (optional - can be skipped if slow)
Write-Host ""
Write-Host "8. Build test (optional - may take time)..." -ForegroundColor Yellow
$buildTest = Read-Host "   Run build test? (y/N)"
if ($buildTest -eq "y" -or $buildTest -eq "Y") {
    try {
        Write-Host "   Building project..." -ForegroundColor Yellow
        $buildOutput = npm run build 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Build successful" -ForegroundColor Green
        } else {
            $errors += "Build failed"
            Write-Host "   ✗ Build failed" -ForegroundColor Red
            Write-Host "   $buildOutput" -ForegroundColor Red
        }
    } catch {
        $errors += "Build test failed: $($_.Exception.Message)"
        Write-Host "   ✗ Build test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⊘ Build test skipped" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
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

