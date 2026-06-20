# 构建所有 zhao-* 插件的 PowerShell 脚本
# 用法: .\scripts\build-plugins.ps1

$ErrorActionPreference = "Stop"

Write-Host "开始构建所有插件..." -ForegroundColor Cyan

# 获取项目根目录
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$PLUGINS_DIR = Join-Path $PROJECT_ROOT "plugins"

if (-not (Test-Path $PLUGINS_DIR)) {
    Write-Host "错误: plugins 目录不存在" -ForegroundColor Red
    exit 1
}

# 统计
$TOTAL = 0
$SUCCESS = 0
$FAILED = 0

# 遍历所有 zhao-* 插件目录
Get-ChildItem -Path $PLUGINS_DIR -Directory -Filter "zhao-*" | ForEach-Object {
    $plugin_dir = $_.FullName
    $plugin_name = $_.Name
    $TOTAL++
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Gray
    Write-Host "构建插件: $plugin_name" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Gray
    
    Push-Location $plugin_dir
    
    # 检查是否有 package.json 和 build 脚本
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        if ($packageJson.scripts.build) {
            try {
                npm run build
                $SUCCESS++
                Write-Host "✅ $plugin_name 构建成功" -ForegroundColor Green
            }
            catch {
                $FAILED++
                Write-Host "❌ $plugin_name 构建失败: $_" -ForegroundColor Red
            }
        }
        else {
            Write-Host "⚠️ $plugin_name 没有 build 脚本，跳过" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "⚠️ $plugin_name 没有 package.json，跳过" -ForegroundColor Yellow
    }
    
    Pop-Location
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Gray
Write-Host "构建完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Gray
Write-Host "总计: $TOTAL 个插件"
Write-Host "成功: $SUCCESS" -ForegroundColor Green
Write-Host "失败: $FAILED" -ForegroundColor Red
Write-Host ""

if ($FAILED -gt 0) {
    exit 1
}