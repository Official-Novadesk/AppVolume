# Novadesk Addon SDK Build Script
# This script finds MSBuild and builds the Addon SDK examples.

param(
    [string]$Configuration = "Debug",
    [string]$Platform = "x64"
)

$vswhere = "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe"

if (-not (Test-Path $vswhere)) {
    Write-Host "Error: vswhere.exe not found at $vswhere" -ForegroundColor Red
    Write-Host "Visual Studio Installer is required for this script to work automatically." -ForegroundColor Yellow
    exit 1
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Novadesk Addon SDK Build System" -ForegroundColor Cyan
Write-Host " Configuration: $Configuration" -ForegroundColor Gray
Write-Host " Platform:      $Platform" -ForegroundColor Gray
Write-Host "====================================================" -ForegroundColor Cyan

# Find MSBuild using vswhere
Write-Host "Locating MSBuild..." -ForegroundColor DarkGray
$msbuildPath = & $vswhere -latest -products * -requires Microsoft.Component.MSBuild -find MSBuild\**\Bin\MSBuild.exe | Select-Object -First 1

if (-not $msbuildPath) {
    Write-Host "Error: MSBuild.exe could not be located." -ForegroundColor Red
    exit 1
}

Write-Host "Using: $msbuildPath" -ForegroundColor DarkGray
Write-Host ""

# Run MSBuild
# Using /m for parallel build to speed up things
& $msbuildPath "AppVolume.sln" /t:Build /p:Configuration=$Configuration /p:Platform=$Platform /m /v:minimal

if ($LASTEXITCODE -eq 0) {
    if ($Configuration -ne "Release") {
        Write-Host ""
        Write-Host "====================================================" -ForegroundColor Cyan
        Write-Host " BUILD SUCCESSFUL" -ForegroundColor Green
        Write-Host "====================================================" -ForegroundColor Cyan
        exit 0
    }

    $root = Split-Path -Parent $MyInvocation.MyCommand.Path
    $addonMetaPath = Join-Path $root "addon.json"
    $addonMeta = $null
    if (Test-Path $addonMetaPath) {
        $addonMeta = Get-Content $addonMetaPath | ConvertFrom-Json
    }

    $addonName = if ($addonMeta -and $addonMeta.name) { $addonMeta.name } else { "AppVolume" }
    $addonVersion = if ($addonMeta -and $addonMeta.version) { $addonMeta.version } else { "0.0.0" }

    $distDir = Join-Path $root ("dist\\{0}\\{1}" -f $Platform, $Configuration)
    $dllPath = Join-Path $distDir ("{0}\\{0}.dll" -f $addonName)
    $packageRoot = Join-Path $distDir ("{0}_v{1}" -f $addonName, $addonVersion)
    $widgetsSrc = Join-Path $root "Widgets"
    $widgetsSrcRoot = Join-Path $widgetsSrc "src"
    $widgetsDestSrc = Join-Path $packageRoot "src"
    $packageAddon = Join-Path $widgetsDestSrc "addon"
    $zipPath = Join-Path $distDir ("{0}_v{1}.zip" -f $addonName, $addonVersion)

    if (Test-Path $packageRoot) {
        Remove-Item $packageRoot -Recurse -Force
    }
    if (-not (Test-Path $packageRoot)) {
        New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
    }

    $widgetsMeta = Join-Path $widgetsSrc "meta.json"
    if (Test-Path $widgetsMeta) {
        Copy-Item $widgetsMeta $packageRoot -Force
    } else {
        Write-Host "Warning: meta.json not found at $widgetsMeta" -ForegroundColor Yellow
    }

    if (Test-Path $widgetsSrcRoot) {
        New-Item -ItemType Directory -Path $widgetsDestSrc -Force | Out-Null
        Copy-Item (Join-Path $widgetsSrcRoot "*") $widgetsDestSrc -Recurse -Force
    } else {
        Write-Host "Warning: Widgets src folder not found at $widgetsSrcRoot" -ForegroundColor Yellow
    }
    if (-not (Test-Path $widgetsSrc)) {
        Write-Host "Warning: Widgets folder not found at $widgetsSrc" -ForegroundColor Yellow
    }

    New-Item -ItemType Directory -Path $packageAddon -Force | Out-Null
    if (Test-Path $dllPath) {
        Copy-Item $dllPath $packageAddon -Force
    } else {
        Write-Host "Warning: DLL not found at $dllPath" -ForegroundColor Yellow
    }

    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $zipPath -Force

    Write-Host ""
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host " BUILD SUCCESSFUL" -ForegroundColor Green
    Write-Host "====================================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "====================================================" -ForegroundColor Red
    Write-Host " BUILD FAILED (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "====================================================" -ForegroundColor Red
    exit $LASTEXITCODE
}
