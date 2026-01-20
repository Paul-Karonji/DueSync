# Quick Start: Deploy DueSync to Google Play Store

This is a condensed version of the full deployment guide. For detailed instructions, see [PLAY_STORE_DEPLOYMENT.md](./PLAY_STORE_DEPLOYMENT.md).

## Prerequisites

- ✅ App deployed at: https://duesync.wiktechnologies.com/
- [ ] Google Play Console account ($25)
- [ ] Android Studio installed
- [ ] Java JDK 11+ installed

## Quick Steps

### 1. Deploy Updated Files

```bash
# Commit and push the Digital Asset Links and manifest changes
git add .
git commit -m "Add TWA configuration for Play Store"
git push
```

Wait for deployment, then verify:
- https://duesync.wiktechnologies.com/.well-known/assetlinks.json

### 2. Install Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

### 3. Create TWA Project

```bash
# Create directory (outside TaskIQ project)
cd C:\Users\WAKE FRANSISCA\Documents\Career path\WIK
mkdir DueSync-Android
cd DueSync-Android

# Initialize TWA
bubblewrap init --manifest https://duesync.wiktechnologies.com/manifest.json
```

**Use these values:**
- Package: `com.wiktechnologies.duesync`
- App name: `DueSync`
- Host: `duesync.wiktechnologies.com`

### 4. Generate Signing Key

```bash
keytool -genkey -v -keystore duesync-release-key.keystore -alias duesync -keyalg RSA -keysize 2048 -validity 10000
```

**⚠️ Save the password!**

### 5. Get SHA256 Fingerprint

```bash
keytool -list -v -keystore duesync-release-key.keystore -alias duesync
```

Copy the SHA256 fingerprint.

### 6. Update Asset Links

1. Edit `TaskIQ/public/.well-known/assetlinks.json`
2. Replace `PLACEHOLDER_FINGERPRINT_WILL_BE_GENERATED_NEXT` with your SHA256
3. Deploy to production

### 7. Build App

```bash
bubblewrap build
```

Generates:
- `app-release-signed.apk` (for testing)
- `app-release-bundle.aab` (for Play Store)

### 8. Test

```bash
bubblewrap install
```

### 9. Play Store Setup

1. Create account at https://play.google.com/console
2. Create app
3. Upload `app-release-bundle.aab`
4. Add screenshots and graphics
5. Submit for review

## Required Assets

- [ ] Feature graphic (1024x500)
- [ ] Phone screenshots (at least 2)
- [ ] Privacy policy URL
- [ ] App description

## Timeline

- Setup: 2-4 hours
- Google review: 1-7 days

## Need Help?

See full guide: [PLAY_STORE_DEPLOYMENT.md](./PLAY_STORE_DEPLOYMENT.md)
