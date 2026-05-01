@echo off
set "LICENSE_DIR=C:\Users\paul\.bubblewrap\android_sdk\licenses"
if not exist "%LICENSE_DIR%" mkdir "%LICENSE_DIR%"
(
echo 8933bad161af4178b1185d1a37fbf41ea5269c55
echo d56f5187479451eabf01fb78af6dfcb131a6481e
echo 24333f8a63b6825ea9c5514f83c2829b004d1fee
) > "%LICENSE_DIR%\android-sdk-license"
echo License written to %LICENSE_DIR%
