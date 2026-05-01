# Next Steps After JDK Installation

## Current Status

✅ **Completed:**
- Bubblewrap CLI installed globally
- Production deployment verified
- Asset links accessible at: https://duesync.wiktechnologies.com/.well-known/assetlinks.json
- Manifest verified at: https://duesync.wiktechnologies.com/manifest.json

⏳ **In Progress:**
- JDK 17 downloading (automatic via Bubblewrap)

---

## What to Do After JDK Installation Completes

### Step 1: Initialize TWA Project

Once the JDK download completes, Bubblewrap will prompt you with questions. Here are the exact values to use:

```bash
# Bubblewrap will ask these questions:
```

| Question | Answer |
|----------|--------|
| **Application name** | `DueSync` |
| **Package ID** | `com.wiktechnologies.duesync` |
| **Host** | `duesync.wiktechnologies.com` |
| **Start URL** | `/` |
| **Display mode** | `standalone` |
| **Status bar color** | `#10B981` |
| **Theme color** | `#10B981` |
| **Background color** | `#ffffff` |
| **Icon URL** | `https://duesync.wiktechnologies.com/icons/icon-512x512.png` |
| **Maskable icon URL** | `https://duesync.wiktechnologies.com/icons/icon-512x512-maskable.png` |
| **Splash screen fade out duration** | `300` (default) |
| **Enable site settings shortcut** | `Yes` |
| **Enable notifications** | `Yes` |
| **Fallback behavior** | `customtabs` |

### Step 2: Create Separate Android Project Directory

After Bubblewrap initialization completes, you'll need to create a separate directory for the Android project:

```powershell
# Navigate to parent directory
cd "C:\Users\WAKE FRANSISCA\Documents\Career path\WIK"

# Create Android project directory
mkdir DueSync-Android
cd DueSync-Android

# Initialize TWA here
bubblewrap init --manifest https://duesync.wiktechnologies.com/manifest.json
```

### Step 3: Generate Signing Key

```powershell
# Generate keystore for app signing
keytool -genkey -v -keystore duesync-release-key.keystore -alias duesync -keyalg RSA -keysize 2048 -validity 10000
```

**You'll be prompted for:**
- **Keystore password:** (create a strong password and SAVE IT!)
- **Re-enter password:** (same password)
- **First and last name:** `WIK Technologies`
- **Organizational unit:** `Development`
- **Organization:** `WIK Technologies`
- **City:** (your city)
- **State/Province:** (your state)
- **Country code:** (e.g., `US`, `KE`, etc.)

⚠️ **CRITICAL:** Save the keystore file (`duesync-release-key.keystore`) and password in a secure location! You'll need them for ALL future app updates.

### Step 4: Get SHA256 Fingerprint

```powershell
keytool -list -v -keystore duesync-release-key.keystore -alias duesync
```

Look for the **SHA256** line in the output. It will look like:
```
SHA256: 14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B6:3F:CF:44:E5
```

**Copy this entire fingerprint** (including the colons).

### Step 5: Update Asset Links with Fingerprint

1. Open: `C:\Users\WAKE FRANSISCA\Documents\Career path\WIK\TaskIQ\public\.well-known\assetlinks.json`

2. Replace `PLACEHOLDER_FINGERPRINT_WILL_BE_GENERATED_NEXT` with your SHA256 fingerprint:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.wiktechnologies.duesync",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B6:3F:CF:44:E5"
      ]
    }
  }
]
```

3. Deploy to production:

```powershell
cd "C:\Users\WAKE FRANSISCA\Documents\Career path\WIK\TaskIQ"
git add public/.well-known/assetlinks.json
git commit -m "Update Digital Asset Links with SHA256 fingerprint"
git push
```

4. Wait for deployment and verify:
   - Visit: https://duesync.wiktechnologies.com/.well-known/assetlinks.json
   - Confirm the fingerprint is updated

### Step 6: Build the Android App

```powershell
cd "C:\Users\WAKE FRANSISCA\Documents\Career path\WIK\DueSync-Android"

# Build the app
bubblewrap build
```

**When prompted for keystore details:**
- Keystore path: `duesync-release-key.keystore`
- Keystore password: (your password from Step 3)
- Key alias: `duesync`
- Key password: (same as keystore password)

This will generate:
- `app-release-signed.apk` - For testing on devices
- `app-release-bundle.aab` - For uploading to Play Store

### Step 7: Test on Android Device

**Option A: Using Bubblewrap (if device connected via USB)**
```powershell
bubblewrap install
```

**Option B: Manual Installation**
1. Copy `app-release-signed.apk` to your Android device
2. Enable "Install from unknown sources" in Settings
3. Open the APK file and install

**Testing Checklist:**
- [ ] App launches without browser UI
- [ ] Splash screen displays correctly
- [ ] App icon appears on home screen
- [ ] Offline functionality works
- [ ] Push notifications work
- [ ] Google Calendar sync works
- [ ] All features function properly
- [ ] Theme colors applied correctly

---

## Troubleshooting

### If JDK Installation Fails

Install JDK manually:
1. Download JDK 17 from: https://adoptium.net/
2. Install it
3. Set JAVA_HOME environment variable
4. Run `bubblewrap init` again

### If Bubblewrap Init Fails

Try with skip validation flag:
```powershell
bubblewrap init --manifest https://duesync.wiktechnologies.com/manifest.json --skipPwaValidation
```

### If Build Fails

```powershell
# Clean and rebuild
bubblewrap build --skipPwaValidation
```

---

## What Comes Next

After successfully building and testing the APK:

1. **Create Play Store Assets** (see `docs/PLAY_STORE_DEPLOYMENT.md` Step 7)
   - Feature graphic (1024x500)
   - Screenshots (phone & tablet)
   - Privacy policy

2. **Register Google Play Console** ($25)
   - https://play.google.com/console

3. **Submit App**
   - Upload `app-release-bundle.aab`
   - Complete store listing
   - Submit for review

---

## Quick Reference

**Commands Summary:**
```powershell
# After JDK installation completes:
cd "C:\Users\WAKE FRANSISCA\Documents\Career path\WIK"
mkdir DueSync-Android
cd DueSync-Android
bubblewrap init --manifest https://duesync.wiktechnologies.com/manifest.json

# Generate signing key:
keytool -genkey -v -keystore duesync-release-key.keystore -alias duesync -keyalg RSA -keysize 2048 -validity 10000

# Get fingerprint:
keytool -list -v -keystore duesync-release-key.keystore -alias duesync

# Build app:
bubblewrap build

# Test on device:
bubblewrap install
```

**Important Files:**
- Keystore: `DueSync-Android/duesync-release-key.keystore`
- APK: `DueSync-Android/app-release-signed.apk`
- AAB: `DueSync-Android/app-release-bundle.aab`
- Asset Links: `TaskIQ/public/.well-known/assetlinks.json`

---

## Need Help?

Refer to the full guide: [`docs/PLAY_STORE_DEPLOYMENT.md`](file:///C:/Users/WAKE%20FRANSISCA/Documents/Career%20path/WIK/TaskIQ/docs/PLAY_STORE_DEPLOYMENT.md)
