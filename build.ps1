# Script PowerShell pour empaqueter l'extension Chrome Robert IA
param(
    [string]$OutputDir = ".\dist",
    [string]$PackageName = "robert-extension"
)

Write-Host "Empaquetage de l'extension Robert IA..." -ForegroundColor Cyan
Write-Host ""

# Verifier que nous sommes dans le bon repertoire
if (-not (Test-Path "manifest.json")) {
    Write-Host "Erreur: manifest.json introuvable." -ForegroundColor Red
    exit 1
}

# Creer le repertoire de sortie s'il n'existe pas
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "Repertoire de sortie cree: $OutputDir" -ForegroundColor Green
}

# Lire la version depuis manifest.json
$manifest = Get-Content "manifest.json" | ConvertFrom-Json
$version = $manifest.version
$extensionName = $manifest.name

Write-Host "Extension: $extensionName" -ForegroundColor Cyan
Write-Host "Version: $version" -ForegroundColor Cyan
Write-Host ""

# Definir le nom du fichier de sortie
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFileName = "$PackageName-v$version-$timestamp.zip"
$zipPath = Join-Path $OutputDir $zipFileName

# Fichiers et dossiers a inclure dans le package
$itemsToInclude = @(
    "manifest.json",
    "README.md",
    "icons",
    "scripts", 
    "styles",
    "templates"
)

Write-Host "Creation du package ZIP..." -ForegroundColor Cyan

# Supprimer le fichier ZIP s'il existe deja
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Creer une archive temporaire en utilisant Compress-Archive
$tempItems = @()
foreach ($item in $itemsToInclude) {
    if (Test-Path $item) {
        $tempItems += $item
        Write-Host "  Ajout: $item" -ForegroundColor Yellow
    } else {
        Write-Host "  Element manquant (ignore): $item" -ForegroundColor Yellow
    }
}

try {
    Compress-Archive -Path $tempItems -DestinationPath $zipPath -Force
    
    # Verifier la taille du fichier
    $fileSize = (Get-Item $zipPath).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "Package cree avec succes!" -ForegroundColor Green
    Write-Host "Fichier: $zipPath" -ForegroundColor Green
    Write-Host "Taille: $fileSizeMB MB" -ForegroundColor Green
    Write-Host ""
    
    # Conseils d'utilisation
    Write-Host "Instructions d'installation:" -ForegroundColor Cyan
    Write-Host "   1. Ouvrez Chrome et allez dans chrome://extensions/" -ForegroundColor Cyan
    Write-Host "   2. Activez le 'Mode developpeur' en haut a droite" -ForegroundColor Cyan
    Write-Host "   3. Cliquez sur 'Charger l'extension non empaquetee'" -ForegroundColor Cyan
    Write-Host "   4. Selectionnez le dossier de l'extension (pas le ZIP)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pour le Chrome Web Store:" -ForegroundColor Cyan
    Write-Host "   - Utilisez ce fichier ZIP pour soumettre l'extension" -ForegroundColor Cyan
    Write-Host "   - Taille limite: 512 MB (actuelle: $fileSizeMB MB)" -ForegroundColor Cyan
    
} catch {
    Write-Host "Erreur lors de la creation du package: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Empaquetage termine!" -ForegroundColor Green
