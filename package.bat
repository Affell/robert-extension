@echo off
echo.
echo ================================================
echo    EMPAQUETAGE EXTENSION ROBERT IA
echo ================================================
echo.

REM Verifier que nous sommes dans le bon repertoire
if not exist "manifest.json" (
    echo [ERREUR] manifest.json introuvable.
    echo Assurez-vous d'etre dans le repertoire de l'extension.
    pause
    exit /b 1
)

REM Executer le script PowerShell
powershell -ExecutionPolicy Bypass -File ".\package-extension-simple.ps1"

echo.
echo ================================================
echo    EMPAQUETAGE TERMINE
echo ================================================
echo.
echo Le fichier ZIP se trouve dans le dossier 'dist'
echo.

REM Ouvrir le dossier dist dans l'explorateur
if exist "dist" (
    echo Ouverture du dossier dist...
    start "" "dist"
)

pause
