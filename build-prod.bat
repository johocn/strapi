@echo off
chcp 65001 > nul
echo ========================================
echo  快速部署构建脚本
echo  1. 构建所有插件 dist
echo  2. 构建 Strapi（TS + admin panel）
echo ========================================
cd /d "%~dp0"

echo.
echo [1/2] 构建所有插件...
for /d %%p in (plugins\zhao-*) do (
    if exist "%%p\package.json" (
        echo   → 构建插件: %%p
        cd "%%p"
        call npx -y @strapi/sdk-plugin build >nul 2>&1
        if errorlevel 1 (
            echo   [警告] %%p 构建失败，检查是否已有 dist
        ) else (
            echo   [完成] %%p
        )
        cd "%~dp0"
    )
)

echo.
echo [2/2] 构建 Strapi 应用...
call npm run build
if errorlevel 1 (
    echo [错误] Strapi 构建失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo ========================================
echo 构建完成！
echo.
echo 下一步：
echo   git add -A .
echo   git commit -m "build: rebuild for deploy"
echo   git push strapi main
echo ========================================
pause