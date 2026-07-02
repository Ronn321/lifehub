@echo off
REM LifeHub Deploy Script (Windows)
REM Baut Docker Images und pushed sie zu ghcr.io (GitHub Container Registry).
REM Nutzung: scripts\deploy.cmd [VERSION]
REM Beispiel: scripts\deploy.cmd v0.1.0

setlocal enabledelayedexpansion

set VERSION=%1
if "%VERSION%"=="" set VERSION=latest
set REGISTRY=ghcr.io/ronn321

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

REM GHCR Login
if defined GITHUB_TOKEN (
    echo %GITHUB_TOKEN% | docker login ghcr.io -u Ronn321 --password-stdin
) else (
    echo Warnung: Kein GITHUB_TOKEN gesetzt. Bitte manuell: docker login ghcr.io
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

REM Push zu GHCR
echo [3/4] Pushing backend:%VERSION%...
docker push %REGISTRY%/lifehub-backend:%VERSION%
docker push %REGISTRY%/lifehub-backend:latest

echo [4/4] Pushing frontend:%VERSION%...
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
echo   docker compose pull
echo   docker compose up -d

endlocal
