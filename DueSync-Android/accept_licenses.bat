@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
set "ANDROID_SDK_ROOT=C:\Users\paul\.bubblewrap\android_sdk"
set "SDKMANAGER=%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat"
echo y | call "%SDKMANAGER%" --licenses --sdk_root="%ANDROID_SDK_ROOT%"
