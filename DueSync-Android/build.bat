@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
set "ANDROID_SDK_ROOT=C:\Users\paul\.bubblewrap\android_sdk"
set "ANDROID_HOME=C:\Users\paul\.bubblewrap\android_sdk"
echo Building APK...
call .\gradlew.bat assembleRelease
