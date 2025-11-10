# Button Detection Script
# Scans all TypeScript/TSX files to find buttons and navigation elements

param(
    [string]$OutputFile = "button-inventory.json"
)

$ErrorActionPreference = "Stop"

Write-Host "🔍 Scanning for buttons and navigation elements..." -ForegroundColor Cyan

$buttonInventory = @()

# Patterns to search for (using single quotes for regex strings)
$buttonPattern = '<Button[^>]*>'
$linkPattern = '<Link[^>]*href'
$routerPushPattern = 'router\.push\(|router\.replace\('
$windowLocationPattern = 'window\.location\.(href|replace)'
$onClickPattern = 'onClick\s*='

# Files to scan
$filesToScan = @(
    Get-ChildItem -Path "app" -Filter "*.tsx" -Recurse
    Get-ChildItem -Path "components" -Filter "*.tsx" -Recurse
)

$totalFiles = $filesToScan.Count
$currentFile = 0

foreach ($file in $filesToScan) {
    $currentFile++
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    
    Write-Host "  Scanning $currentFile/$totalFiles : $relativePath" -ForegroundColor Gray
    
    $content = Get-Content $file.FullName -Raw
    $lines = Get-Content $file.FullName
    
    # Check for Button components
    if ($content -match $buttonPattern) {
        $buttonMatches = [regex]::Matches($content, $buttonPattern)
        foreach ($match in $buttonMatches) {
            $lineNum = ($content.Substring(0, $match.Index) -split "`n").Count
            
            # Try to find button text (next few lines)
            $buttonText = ""
            $contextLines = $lines[$lineNum..([Math]::Min($lineNum + 5, $lines.Count - 1))]
            foreach ($line in $contextLines) {
                if ($line -match '>([^<]+)</Button>' -or $line -match '>([^<]+)<') {
                    $buttonText = $matches[1].Trim()
                    break
                }
            }
            
            # Check for onClick handler
            $hasOnClick = $match.Value -match 'onClick'
            $onClickHandler = ""
            if ($hasOnClick) {
                if ($match.Value -match 'onClick\s*=\s*{?([^}]+)}?') {
                    $onClickHandler = $matches[1].Trim()
                }
            }
            
            $buttonInventory += @{
                file = $relativePath
                line = $lineNum + 1
                type = "Button"
                text = $buttonText
                hasOnClick = $hasOnClick
                onClickHandler = $onClickHandler
                code = $lines[$lineNum]
            }
        }
    }
    
    # Check for Link components
    if ($content -match $linkPattern) {
        $linkRegex = '<Link[^>]*href\s*=\s*["'']([^"'']+)["'']'
        $linkMatches = [regex]::Matches($content, $linkRegex)
        foreach ($match in $linkMatches) {
            $lineNum = ($content.Substring(0, $match.Index) -split "`n").Count
            $href = $match.Groups[1].Value
            
            $buttonInventory += @{
                file = $relativePath
                line = $lineNum + 1
                type = "Link"
                href = $href
                code = $lines[$lineNum]
            }
        }
    }
    
    # Check for router.push/replace calls
    if ($content -match $routerPushPattern) {
        $routerRegex = 'router\.(push|replace)\(["'']([^"'']+)["'']'
        $routerMatches = [regex]::Matches($content, $routerRegex)
        foreach ($match in $routerMatches) {
            $lineNum = ($content.Substring(0, $match.Index) -split "`n").Count
            $method = $match.Groups[1].Value
            $target = $match.Groups[2].Value
            
            $buttonInventory += @{
                file = $relativePath
                line = $lineNum + 1
                type = "RouterNavigation"
                method = $method
                target = $target
                code = $lines[$lineNum]
            }
        }
    }
    
    # Check for window.location navigation
    if ($content -match $windowLocationPattern) {
        $locationRegex = 'window\.location\.(href|replace)\s*=\s*["'']([^"'']+)["'']'
        $locationMatches = [regex]::Matches($content, $locationRegex)
        foreach ($match in $locationMatches) {
            $lineNum = ($content.Substring(0, $match.Index) -split "`n").Count
            $method = $match.Groups[1].Value
            $target = $match.Groups[2].Value
            
            $buttonInventory += @{
                file = $relativePath
                line = $lineNum + 1
                type = "WindowLocation"
                method = $method
                target = $target
                code = $lines[$lineNum]
            }
        }
    }
    
    # Check for onClick handlers (standalone)
    if ($content -match $onClickPattern) {
        $onClickRegex = 'onClick\s*=\s*{?([^}]+)}?'
        $onClickMatches = [regex]::Matches($content, $onClickRegex)
        foreach ($match in $onClickMatches) {
            $lineNum = ($content.Substring(0, $match.Index) -split "`n").Count
            $handler = $match.Groups[1].Value.Trim()
            
            # Only add if not already captured as Button
            $alreadyCaptured = $false
            foreach ($item in $buttonInventory) {
                if ($item.file -eq $relativePath -and $item.line -eq ($lineNum + 1)) {
                    $alreadyCaptured = $true
                    break
                }
            }
            
            if (-not $alreadyCaptured) {
                $buttonInventory += @{
                    file = $relativePath
                    line = $lineNum + 1
                    type = "OnClickHandler"
                    handler = $handler
                    code = $lines[$lineNum]
                }
            }
        }
    }
}

# Generate summary
$summary = @{
    totalButtons = ($buttonInventory | Where-Object { $_.type -eq "Button" }).Count
    totalLinks = ($buttonInventory | Where-Object { $_.type -eq "Link" }).Count
    totalRouterNav = ($buttonInventory | Where-Object { $_.type -eq "RouterNavigation" }).Count
    totalWindowNav = ($buttonInventory | Where-Object { $_.type -eq "WindowLocation" }).Count
    buttonsWithOnClick = ($buttonInventory | Where-Object { $_.type -eq "Button" -and $_.hasOnClick -eq $true }).Count
    buttonsWithoutOnClick = ($buttonInventory | Where-Object { $_.type -eq "Button" -and ($_.hasOnClick -eq $false -or $null -eq $_.hasOnClick) }).Count
}

$report = @{
    timestamp = (Get-Date).ToISOString()
    summary = $summary
    buttons = $buttonInventory
}

# Save to JSON
$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host "`n✅ Button detection complete!" -ForegroundColor Green
Write-Host "   Total Buttons: $($summary.totalButtons)" -ForegroundColor Cyan
Write-Host "   Buttons with onClick: $($summary.buttonsWithOnClick)" -ForegroundColor Cyan
Write-Host "   Buttons without onClick: $($summary.buttonsWithoutOnClick)" -ForegroundColor Yellow
Write-Host "   Total Links: $($summary.totalLinks)" -ForegroundColor Cyan
Write-Host "   Router Navigation: $($summary.totalRouterNav)" -ForegroundColor Cyan
Write-Host "   Window Location: $($summary.totalWindowNav)" -ForegroundColor Cyan
Write-Host "`n📄 Report saved to: $OutputFile" -ForegroundColor Green

if ($summary.buttonsWithoutOnClick -gt 0) {
    Write-Host "`n⚠️  WARNING: Found $($summary.buttonsWithoutOnClick) buttons without onClick handlers!" -ForegroundColor Red
    Write-Host "   These buttons may not be functional." -ForegroundColor Yellow
}
