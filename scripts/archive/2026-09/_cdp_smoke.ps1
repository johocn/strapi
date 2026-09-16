Get-Process chrome -ErrorAction SilentlyContinue | ForEach-Object { "PID=$($_.Id) running" }
$args = @('--headless=new','--disable-gpu','--remote-debugging-port=9341','--user-data-dir=C:\Windows\Temp\cdp-ok3','--no-first-run','about:blank')
Start-Process 'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe' -ArgumentList $args
Start-Sleep 6
Write-Output "=== processes ==="
Get-Process chrome -ErrorAction SilentlyContinue | ForEach-Object { "PID=$($_.Id)" }
Write-Output "=== port 9341 ==="
Get-NetTCPConnection -LocalPort 9341 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { "Listen PID=$($_.OwningProcess)" }
Write-Output "=== direct http ==="
try { $v = Invoke-WebRequest 'http://127.0.0.1:9341/json/version' -TimeoutSec 4 -UseBasicParsing; $v.Content } catch { "HTTP fail: $($_.Exception.Message)" }
Write-Output "=== done ==="