@echo off
set "BASE_DIR=%~dp0app\src\main\res"
set "DRAWABLE_DIR=%BASE_DIR%\drawable"
set "MIPMAP_DIR=%BASE_DIR%\mipmap-xxxhdpi"

if not exist "%MIPMAP_DIR%" mkdir "%MIPMAP_DIR%"

echo Copying ic_maskable...
copy "%DRAWABLE_DIR%\icon.png" "%MIPMAP_DIR%\ic_maskable.png"
copy "%DRAWABLE_DIR%\icon.png" "%MIPMAP_DIR%\ic_launcher.png"

echo Mipmaps fixed.
