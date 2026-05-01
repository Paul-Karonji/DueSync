@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
set "SDKROOT=C:\Users\paul\.bubblewrap\android_sdk"
set "SDKMGR=%SDKROOT%\cmdline-tools\latest\bin\sdkmanager.bat"
echo Installing Android SDK components...
echo y | call "%SDKMGR%" --sdk_root="%SDKROOT%" "build-tools;35.0.0" "platforms;android-35" "platforms;android-36"
echo Done.
