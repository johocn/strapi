$plugins = @('zhao-channel', 'zhao-auth', 'zhao-common', 'zhao-third', 'zhao-course')
$allOk = $true

foreach ($p in $plugins) {
    $path = "E:\code\plugins\$p\package.json"
    if (-not (Test-Path $path)) {
        Write-Host "$p : FILE NOT FOUND"
        $allOk = $false
        continue
    }
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $hasBom = ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    if ($hasBom) {
        $content = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
        [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
        Write-Host "$p : BOM FIXED"
    } else {
        try {
            $json = Get-Content $path -Raw | ConvertFrom-Json
            Write-Host "$p : OK"
        } catch {
            Write-Host "$p : JSON_PARSE_ERROR - $_"
            $allOk = $false
        }
    }
}

if ($allOk) { Write-Host "ALL OK - 可以尝试构建" }
else { Write-Host "仍有问题需要修复" }
