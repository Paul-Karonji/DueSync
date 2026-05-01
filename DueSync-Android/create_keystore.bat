@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
"%JAVA_HOME%\bin\keytool.exe" -genkeypair -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000 -storepass password123 -keypass password123 -dname "CN=WIK Technologies, OU=Development, O=WIK Technologies, L=City, S=State, C=US"
echo KEYSTORE GENERATED. FINGERPRINT:
"%JAVA_HOME%\bin\keytool.exe" -list -v -keystore android.keystore -alias android -storepass password123
