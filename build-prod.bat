@echo off
chcp 65001 >nul
echo ================================================
echo         Strapi Production Build Script
echo ================================================
echo.

setlocal enabledelayedexpansion

set NODE_OPTIONS=--max-old-space-size=8192

echo [1/2] Building plugins...
powershell -ExecutionPolicy Bypass -File scripts\build-plugins.ps1
if errorlevel 1 (
    echo.
    echo ERROR: Plugin build failed!
    exit /b 1
)
echo Plugin build completed successfully.
echo.

echo [2/2] Building Strapi main project...
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: Strapi build failed!
    echo Try increasing NODE_OPTIONS memory limit.
    exit /b 1
)
echo Strapi build completed successfully.
echo.

echo ================================================
echo              Build Completed!
echo ================================================
echo.
echo Build artifacts:
echo   - dist/      (TypeScript compiled)
echo   - build/     (Admin panel)
echo   - plugins/*/dist/  (Plugin builds)
echo.
echo Next steps:
echo   1. git add dist build plugins/*/dist
echo   2. git commit -m "build: production build"
echo   3. git push origin main
echo   4. On server: git pull && docker-compose up -d --build