# Dev Clean Start Script
# Stops node processes on the target port, removes .next cache, sets DEV_PORT, and launches the dev server.

param(
    [int]$Port = 3000,
    [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "[dev-clean-start] Using project root: $projectRoot"

function Stop-PortProcesses {
    param([int]$TargetPort)

    $pids = @()
    try {
        $connections = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction Stop
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        Write-Host "[dev-clean-start] Get-NetTCPConnection failed, falling back to netstat parsing."
        $netstat = netstat -ano | Select-String ":$TargetPort"
        foreach ($line in $netstat) {
            $parts = $line.ToString().Trim() -split "\s+"
            if ($parts.Length -ge 5 -and $parts[1].EndsWith(":$TargetPort")) {
                $pids += [int]$parts[-1]
            }
        }
        $pids = $pids | Sort-Object -Unique
    }

    if ($pids.Count -eq 0) {
        Write-Host "[dev-clean-start] No processes listening on port $TargetPort."
        return
    }

    foreach ($procId in $pids) {
        try {
            Write-Host "[dev-clean-start] Stopping process $procId on port $TargetPort..."
            Stop-Process -Id $procId -Force
        } catch {
            Write-Warning ("[dev-clean-start] Failed to stop process {0}: {1}" -f $procId, $_)
        }
    }
}

# 1. Stop lingering processes on port
Stop-PortProcesses -TargetPort $Port

# 2. Remove .next cache if present
$nextPath = Join-Path $projectRoot ".next"
if (Test-Path $nextPath) {
    Write-Host "[dev-clean-start] Removing $nextPath ..."
    Remove-Item -Recurse -Force $nextPath
} else {
    Write-Host "[dev-clean-start] No .next directory found."
}

# 3. Set DEV_PORT for downstream scripts
Write-Host "[dev-clean-start] Setting DEV_PORT=$Port for current session."
$env:DEV_PORT = $Port

# 4. Launch dev server unless suppressed
if ($NoLaunch) {
    Write-Host "[dev-clean-start] NoLaunch flag set. Skipping dev server start."
    return
}

$launchCommand = "cd `"$projectRoot`"; npm run dev:both"
Write-Host "[dev-clean-start] Starting dev server with: $launchCommand"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit","-Command",$launchCommand
Write-Host "[dev-clean-start] Dev server launched in a new PowerShell window."
