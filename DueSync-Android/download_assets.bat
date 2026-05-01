@echo off
set "RES_DIR=%~dp0app\src\main\res\drawable"
if not exist "%RES_DIR%" mkdir "%RES_DIR%"

echo Downloading icon...
powershell -Command "Invoke-WebRequest -Uri 'https://duesync.wiktechnologies.com/icons/icon-512x512.png' -OutFile '%RES_DIR%\icon.png'"

echo Copying assets...
copy "%RES_DIR%\icon.png" "%RES_DIR%\splash.png"
copy "%RES_DIR%\icon.png" "%RES_DIR%\ic_notification_icon.png"
copy "%RES_DIR%\icon.png" "%RES_DIR%\shortcut_0.png"
copy "%RES_DIR%\icon.png" "%RES_DIR%\shortcut_1.png"
copy "%RES_DIR%\icon.png" "%RES_DIR%\shortcut_2.png"

echo Assets created.
