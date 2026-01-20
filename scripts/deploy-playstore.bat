@echo off
REM Quick deployment script for DueSync Play Store TWA

echo ========================================
echo DueSync Play Store Deployment Helper
echo ========================================
echo.

REM Check if Bubblewrap is installed
where bubblewrap >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/5] Installing Bubblewrap CLI...
    call npm install -g @bubblewrap/cli
) else (
    echo [1/5] Bubblewrap already installed ✓
)

echo.
echo [2/5] Next steps:
echo.
echo 1. Deploy your updated files to production
echo    - Commit: git add . ^&^& git commit -m "Add TWA config"
echo    - Push: git push
echo.
echo 2. Verify asset links are accessible:
echo    https://duesync.wiktechnologies.com/.well-known/assetlinks.json
echo.
echo 3. Create TWA project directory:
echo    cd C:\Users\WAKE FRANSISCA\Documents\Career path\WIK
echo    mkdir DueSync-Android
echo    cd DueSync-Android
echo.
echo 4. Initialize TWA:
echo    bubblewrap init --manifest https://duesync.wiktechnologies.com/manifest.json
echo.
echo 5. Generate signing key:
echo    keytool -genkey -v -keystore duesync-release-key.keystore -alias duesync -keyalg RSA -keysize 2048 -validity 10000
echo.
echo 6. Get SHA256 fingerprint:
echo    keytool -list -v -keystore duesync-release-key.keystore -alias duesync
echo.
echo 7. Update assetlinks.json with your SHA256 fingerprint
echo.
echo 8. Build the app:
echo    bubblewrap build
echo.
echo 9. Test on device:
echo    bubblewrap install
echo.
echo 10. Upload to Play Store:
echo     Upload app-release-bundle.aab
echo.
echo ========================================
echo For detailed instructions, see:
echo docs\PLAY_STORE_DEPLOYMENT.md
echo ========================================
echo.

pause
