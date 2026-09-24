# ============================================
# 一键部署入口：后端 zhao-sso 插件 + 前端 H5（C 端 v.joho.cn）
# 用法：
#   .\deploy-all.ps1 -Message "提交说明"            # 前后端全量
#   .\deploy-all.ps1 -Message "..." -SkipFrontend   # 只部署后端
#   .\deploy-all.ps1 -Message "..." -SkipBackend    # 只部署前端
# 说明：
#   后端链路 = 插件构建(npm run build) -> git add plugins/zhao-sso -> commit -> push
#              -> 服务器 deploy-zhao-sso.sh(pull+重启) -> /_health 健康检查
#   前端链路 = build:h5 -> deploy-h5.ps1(scp 上传 v.joho.cn + SYNC_OK 校验)
#   安全性：git 只暂存 plugins/zhao-sso（node_modules 已 ignore，dist 为提交产物），
#           不动其它未提交文件；前端 H5 靠 scp 发布，不走 git pull。
# ============================================
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Message,
  [switch]$SkipBackend,
  [switch]$SkipFrontend,
  [string]$HostName = "joho",
  [string]$RemoteAppDir = "/www/apps/strapi"
)
$ErrorActionPreference = "Stop"

$Basic    = "E:\code\basic"
$Shao     = "E:\code\shao"
$ZhaoSso  = Join-Path $Basic "plugins\zhao-sso"

function Step([string]$n) { Write-Host "`n=== $n ===" -ForegroundColor Cyan }
function Ok([string]$s)   { Write-Host "  OK   $s" -ForegroundColor Green }
function Fail([string]$s) { Write-Host "  FAIL $s" -ForegroundColor Red }

$deployed = [System.Collections.Generic.List[string]]::new()

if (-not $SkipBackend) {
  # ---------- 后端 zhao-sso ----------
  Step "后端 zhao-sso：构建"
  if (-not (Test-Path (Join-Path $ZhaoSso "node_modules\@strapi\sdk-plugin"))) {
    Write-Host "  首次构建，先安装插件依赖..."
    Push-Location $ZhaoSso
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Fail "npm install"; Pop-Location; exit 1 }
    Pop-Location
  }
  Push-Location $ZhaoSso
  npm run build
  if ($LASTEXITCODE -ne 0) { Fail "插件构建"; Pop-Location; exit 1 }
  Pop-Location
  Ok "插件构建完成"

  Step "后端 git：提交 + 推送（范围=plugins/zhao-sso）"
  Push-Location $Basic
  git add plugins/zhao-sso
  $staged = @(git diff --cached --name-only)
  if ($staged.Count -eq 0) {
    Ok "无可提交改动，跳过 commit/push"
  } else {
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { Fail "git commit"; Pop-Location; exit 1 }
    git push origin main
    if ($LASTEXITCODE -ne 0) { Fail "git push"; Pop-Location; exit 1 }
    Ok "已提交并推送 $($staged.Count) 个文件"
  }
  Pop-Location

  Step "服务器：部署 zhao-sso"
  ssh $HostName "cd $RemoteAppDir && bash ./docs/deployment/deploy-zhao-sso.sh"
  if ($LASTEXITCODE -ne 0) { Fail "服务器部署失败"; exit 1 }

  Step "健康检查 /_health（等待 Strapi 就绪）"
  $health = ""
  for ($i = 0; $i -lt 30; $i++) {
    $code = (ssh $HostName "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/_health")
    if ($code -match '^2') { $health = $code; break }
    Start-Sleep -Seconds 3
  }
  if (-not $health) { Fail "健康检查超时，请 pm2 logs strapi 排查"; exit 1 }
  Ok "健康检查通过 HTTP=$health"
  $deployed.Add("后端 zhao-sso")
}

if (-not $SkipFrontend) {
  # ---------- 前端 H5 ----------
  Step "前端 H5：构建"
  Push-Location $Shao
  npm run build:h5
  if ($LASTEXITCODE -ne 0) { Fail "H5 构建"; Pop-Location; exit 1 }
  Pop-Location
  Ok "H5 构建完成: $Shao\dist\build\h5"

  Step "前端 H5：上传 v.joho.cn"
  Push-Location $Shao
  & .\deploy-h5.ps1
  if ($LASTEXITCODE -ne 0) { Fail "H5 上传"; Pop-Location; exit 1 }
  Pop-Location
  $deployed.Add("前端 H5 (v.joho.cn)")
}

# ---------- 汇总 ----------
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  一键部署完成：$($deployed -join '，')   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  * 后端：pm2 status / pm2 logs strapi 可复查"
Write-Host "  * 前端：移动端如未更新请强刷（微信右上刷新 / 地址栏刷新）"