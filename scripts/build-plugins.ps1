# 构建所有 zhao-* 插件
$ErrorActionPreference = "Stop"
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$PLUGINS_DIR = Join-Path $PROJECT_ROOT "plugins"

Write-Host "开始构建所有插件..."

$TOTAL = 0
$SUCCESS = 0
$FAILED = 0

$plugins = Get-ChildItem -Path $PLUGINS_DIR -Directory -Filter "zhao-*"

foreach ($plugin in $plugins) {
    $TOTAL++
    $name = $plugin.Name
    Write-Host "构建插件: $name"
    
    cd $plugin.FullName
    
    if (Test-Path "package.json") {
        npx -y @strapi/sdk-plugin build
        if ($LASTEXITCODE -eq 0) {
            $SUCCESS++
            Write-Host "✅ $name 成功"
        } else {
            $FAILED++
            Write-Host "❌ $name 失败"
        }
    } else {
        Write-Host "⚠️ $name 跳过"
    }
    
    cd $PROJECT_ROOT
}

Write-Host "完成: $TOTAL 总计, $SUCCESS 成功, $FAILED 失败"

if ($FAILED -gt 0) { exit 1 }