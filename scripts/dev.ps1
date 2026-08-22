#!/usr/bin/env powershell
<#
  开发调度脚本 (dev.ps1) - 固化本机三服务端口契约与常用开发动作
  端口契约(已写死于 manifest.json): backend=1337, web=5174, shao=5175
  HBuilderX 环境本身占用 5173/5174, 故 web 用 5174、shao 用 5175 需各自独占。
  用法(在 e:\code 下执行):
    powershell -NoProfile -File basic\scripts\dev.ps1 status
    powershell -NoProfile -File basic\scripts\dev.ps1 kill-ghost
    powershell -NoProfile -File basic\scripts\dev.ps1 start
    powershell -NoProfile -File basic\scripts\dev.ps1 stop-front
    powershell -NoProfile -File basic\scripts\dev.ps1 psql "SQL"
    powershell -NoProfile -File basic\scripts\dev.ps1 q
  注: 若 PostgreSQL 未启动, 用 E:\PostgreSQL\16\bin\pg_ctl.exe 手动拉起。
#>
param([string]$Action = 'status', [string]$Sql = '')

$BackendPort = 1337
$WebPort     = 5174
$ShaoPort    = 5175
$PSQL        = 'E:\PostgreSQL\16\bin\psql.exe'
$PGCTL       = 'E:\PostgreSQL\16\bin\pg_ctl.exe'

function Get-Listeners {
  $out = @()
  foreach ($line in (netstat -ano)) {
    if ($line -notmatch 'LISTENING') { continue }
    $t = ($line.Trim() -split '\s+')
    $port = $null
    if ($t[1] -match ':(\d+)$') { $port = [int]$matches[1] }
    if ($port -and ($port -eq $BackendPort -or $port -eq $WebPort -or $port -eq $ShaoPort)) {
      $procId = $t[-1]
      $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
      $out += [pscustomobject]@{ Port = $port; PID = $procId; Proc = $proc.ProcessName }
    }
  }
  return $out
}

function Invoke-Status {
  $l = Get-Listeners
  foreach ($name in @(@('backend', $BackendPort), @('web', $WebPort), @('shao', $ShaoPort))) {
    $hit = $l | Where-Object { $_.Port -eq $name[1] }
    if ($hit) {
      Write-Host ("{0,-8} {1}  RUNNING  PID={2} ({3})" -f $name[0], $name[1], $hit.PID, $hit.Proc) -ForegroundColor Green
    } else {
      Write-Host ("{0,-8} {1}  STOPPED" -f $name[0], $name[1]) -ForegroundColor Yellow
    }
  }
}

function Invoke-KillGhost {
  $l = Get-Listeners | Where-Object { $_.Port -eq $WebPort -or $_.Port -eq $ShaoPort }
  foreach ($hit in $l) {
    Write-Host ("kill port {0} PID={1}" -f $hit.Port, $hit.PID) -ForegroundColor Cyan
    & taskkill /PID $hit.PID /F /T 2>&1 | Out-Host
  }
  Invoke-Status
}

function Invoke-StartBackend {
  $running = Get-Listeners | Where-Object { $_.Port -eq $BackendPort }
  if ($running) {
    Write-Host 'backend(1337) already running, skip' -ForegroundColor Yellow
  } else {
    Write-Host 'starting backend(1337) detached...' -ForegroundColor Green
    Start-Process -FilePath 'd:\nvm4w\nodejs\npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'E:\code\basic' -WindowStyle Hidden
  }
}

function Invoke-Psql {
  if ($Sql) {
    & $PSQL -h 127.0.0.1 -p 5432 -U postgres -d strapi -t -A -c "SET CLIENT_ENCODING TO 'UTF8'; $Sql"
  } else {
    & $PSQL -h 127.0.0.1 -p 5432 -U postgres -d strapi
  }
}

switch ($Action) {
  'status'      { Invoke-Status }
  'kill-ghost'  { Invoke-KillGhost }
  'start'       { Invoke-StartBackend }
  'stop-front'  { Invoke-KillGhost }
  'psql'        { Invoke-Psql }
  'pg-start'    { & $PGCTL -D 'E:\PostgreSQL\16\data' -l 'E:\PostgreSQL\16\data\pg.log' start }
  'q'           {
    node -e "const{Client}=require('pg');(async()=>{const c=new Client({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'});await c.connect();const r=await c.query('SELECT id,document_id,status,title FROM activities ORDER BY id DESC LIMIT 15');console.table(r.rows);await c.end()})().catch(e=>{console.error(e.message);process.exit(1)})"
  }
  default       { Invoke-Status }
}