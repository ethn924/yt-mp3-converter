@echo off
cd /d "%~dp0"

where pwsh >nul 2>&1
if %errorlevel%==0 (
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap.ps1"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap.ps1"
)

if %errorlevel% neq 0 (
    echo.
    echo ERREUR : le script d'installation a echoue.
    echo Cause possible : politique d'execution PowerShell bloquee par votre administrateur systeme.
    echo Contactez votre service informatique ou executez manuellement :
    echo   powershell -ExecutionPolicy Bypass -File bootstrap.ps1
    echo.
    pause
)