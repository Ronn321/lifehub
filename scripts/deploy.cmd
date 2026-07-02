@echo off
REM LifeHub Deploy Script (Windows)
REM Baut Docker Images und pushed sie zur privaten Registry auf dem NAS.
REM Nutzung: scripts\deploy.cmd [VERSION] [REGISTRY]
REM Beispiel: scripts\deploy.cmd v0.1.0 100.64.0.1:5000

setlocal enabledelayedexpansion

set VERSION=%1
set REGISTRY=%2
if "%VERSION%"=="" set VERSION=latest
if "%REGISTRY%"=="" set REGISTRY=localhost:5000

echo ============================================
echo   LifeHub Deploy
echo   Version:  %VERSION%
echo   Registry: %REGISTRY%
echo ============================================
echo.

REM Pruefen ob Docker laeuft
docker info >nul 2>&1
if errorlevel 1 (
    echo Fehler: Docker laeuft nicht. Bitte starte Docker Desktop.
    exit /b 1
)

REM Backend Image bauen
echo [1/4] Building backend:%VERSION%...
docker build -t %REGISTRY%/lifehub-backend:%VERSION% -t %REGISTRY%/lifehub-backend:latest -f apps/backend/Dockerfile .
if errorlevel 1 (
    echo Fehler: Backend Build fehlgeschlagen.
    exit /b 1
)
echo   Backend Image gebaut.

REM Frontend Image bauen
echo [2/4] Building frontend:%VERSION%...
docker build -t %REGISTRY%/lifehub-frontend:%VERSION% -t %REGISTRY%/lifehub-frontend:latest -f apps/frontend/Dockerfile .
if errorlevel 1 (
    echo Fehler: Frontend Build fehlgeschlagen.
    exit /b 1
)
echo   Frontend Image gebaut.

REM Push zur Registry
echo [3/4] Pushing backend:%VERSION% to %REGISTRY%...
docker push %REGISTRY%/lifehub-backend:%VERSION%
docker push %REGISTRY%/lifehub-backend:latest

echo [4/4] Pushing frontend:%VERSION% to %REGISTRY%...
docker push %REGISTRY%/lifehub-frontend:%VERSION%
docker push %REGISTRY%/lifehub-frontend:latest

echo.
echo ============================================
echo   Deploy erfolgreich!
echo ============================================
echo.
echo Images gepushed:
echo   %REGISTRY%/lifehub-backend:%VERSION%
echo   %REGISTRY%/lifehub-frontend:%VERSION%
echo.
echo Auf dem NAS jetzt ausfuehren:
echo   cd /volume1/docker/lifehub
echo   docker compose pull
echo   docker compose up -d

endlocal
