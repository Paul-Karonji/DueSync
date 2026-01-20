# Google Play Store Deployment Guide for DueSync

## Overview

This guide walks you through deploying DueSync to the Google Play Store using **Trusted Web Activity (TWA)**. Your app is already deployed at https://duesync.wiktechnologies.com/, so we're ready to proceed!

## Prerequisites Checklist

- [x] App deployed with HTTPS: https://duesync.wiktechnologies.com/
- [x] Valid manifest.json
- [x] Service worker implemented
- [x] Digital Asset Links file created
- [ ] Google Play Console account ($25 one-time fee)
- [ ] Android Studio installed
- [ ] Java JDK 11+ installed

---

## Step 1: Install Required Tools

### Install Bubblewrap CLI

Bubblewrap is Google's official tool for creating TWAs.

```bash
npm install -g @bubblewrap/cli
```

### Verify Installation

```bash
bubblewrap --version
```

---

## Step 2: Initialize TWA Project

### Create TWA Directory

```bash
# Navigate to a directory where you want to create the Android project
# (NOT inside your TaskIQ project)
cd C:\Users\WAKE FRANSISCA\Documents\Career path\WIK

# Create and enter TWA directory
mkdir DueSync-Android
cd DueSync-Android
```

### Initialize TWA

```bash
bubblewrap init --manifest https://duesync.wiktechnologies.com/manifest.json
```

**During initialization, provide these values:**

| Prompt | Value |
|--------|-------|
| Package name | `com.wiktechnologies.duesync` |
| App name | `DueSync` |
| Host | `duesync.wiktechnologies.com` |
| Start URL | `/` |
| Theme color | `#10B981` |
| Background color | `#ffffff` |
| Icon URL | `https://duesync.wiktechnologies.com/icons/icon-512x512.png` |
| Maskable icon | `https://duesync.wiktechnologies.com/icons/icon-512x512-maskable.png` |
| Fallback type | `customtabs` |
| Enable notifications | `yes` |

---

## Step 3: Generate Signing Key

### Create Keystore

```bash
# Navigate to your TWA project
cd DueSync-Android

# Generate signing key
keytool -genkey -v -keystore duesync-release-key.keystore -alias duesync -keyalg RSA -keysize 2048 -validity 10000
```

**You'll be prompted for:**
- Keystore password (create a strong password and SAVE IT!)
- Your name: `WIK Technologies`
- Organizational unit: `Development`
- Organization: `WIK Technologies`
- City: (your city)
- State: (your state)
- Country code: (your country, e.g., `US`)

**⚠️ CRITICAL:** Save the keystore file and password securely! You'll need them for ALL future app updates.

### Get SHA256 Fingerprint

```bash
keytool -list -v -keystore duesync-release-key.keystore -alias duesync
```

Copy the **SHA256** fingerprint (it looks like: `14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B6:3F:CF:44:E5`)

---

## Step 4: Update Digital Asset Links

### Update assetlinks.json

1. Open `C:\Users\WAKE FRANSISCA\Documents\Career path\WIK\TaskIQ\public\.well-known\assetlinks.json`
2. Replace `PLACEHOLDER_FINGERPRINT_WILL_BE_GENERATED_NEXT` with your SHA256 fingerprint
3. Save the file

Example:
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

### Deploy Updated Files

```bash
# In your TaskIQ project directory
cd C:\Users\WAKE FRANSISCA\Documents\Career path\WIK\TaskIQ

# Commit and push changes
git add .
git commit -m "Add Digital Asset Links for Play Store TWA"
git push
```

Wait for Vercel/your hosting to deploy the changes.

### Verify Asset Links

Test that the file is accessible:

```bash
curl https://duesync.wiktechnologies.com/.well-known/assetlinks.json
```

Or visit in browser: https://duesync.wiktechnologies.com/.well-known/assetlinks.json

---

## Step 5: Build the Android App

### Build APK and AAB

```bash
cd C:\Users\WAKE FRANSISCA\Documents\Career path\WIK\DueSync-Android

# Build the app
bubblewrap build
```

When prompted for keystore details, provide:
- Keystore path: `duesync-release-key.keystore`
- Keystore password: (your password)
- Key alias: `duesync`
- Key password: (same as keystore password)

This generates:
- `app-release-signed.apk` - For testing on devices
- `app-release-bundle.aab` - For uploading to Play Store

---

## Step 6: Test on Android Device

### Install on Device

```bash
# Connect your Android device via USB
# Enable USB debugging on your device

# Install the APK
bubblewrap install
```

### Testing Checklist

- [ ] App launches without browser UI
- [ ] Splash screen displays correctly
- [ ] App icon appears on home screen
- [ ] Offline functionality works
- [ ] Push notifications work
- [ ] Google Calendar sync works
- [ ] All features function properly
- [ ] Theme colors applied correctly
- [ ] No errors in app

---

## Step 7: Create Play Store Assets

### Required Graphics

#### 1. Feature Graphic (1024x500)
Create a banner showcasing your app's main features.

**Tips:**
- Use your brand colors (#10B981)
- Show app screenshots or key features
- No text (use visuals only)
- High quality PNG

#### 2. App Screenshots

**Phone Screenshots (at least 2):**
- Resolution: 1080x1920 or similar
- Show key features: task list, add task, focus mode, calendar sync

**Tablet Screenshots (at least 2):**
- 7-inch: 1200x1920
- 10-inch: 1600x2560

**Screenshot Ideas:**
1. Main task list with various tasks
2. Add/edit task dialog
3. Focus mode with Pomodoro timer
4. Calendar sync view
5. Settings/preferences

#### 3. App Icon
- 512x512 PNG (high-res)
- Already have: `/icons/icon-512x512.png` ✅

---

## Step 8: Create Privacy Policy

### Host Privacy Policy

Create a privacy policy page at: `https://wiktechnologies.com/privacy-policy`

**Required sections:**
- What data you collect (email, tasks, preferences)
- How you use the data
- Third-party services (Google Calendar, Resend, Upstash)
- User rights (data deletion, export)
- Contact information

---

## Step 9: Google Play Console Setup

### Create Account

1. Go to https://play.google.com/console
2. Sign in with Google account
3. Pay $25 registration fee (one-time)
4. Complete account setup

### Create App

1. Click "Create app"
2. Fill in details:
   - **App name:** DueSync - Task Management
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free
3. Accept declarations
4. Click "Create app"

---

## Step 10: Complete Store Listing

### Main Store Listing

Navigate to "Store presence" → "Main store listing"

**App name:** `DueSync - Task Management`

**Short description:** (80 characters max)
```
Smart task management with Google Calendar sync and reminders
```

**Full description:** (4000 characters max)
```
DueSync is a modern, feature-rich task management app that helps you organize, prioritize, and complete your tasks with ease.

✨ KEY FEATURES

📝 Smart Task Management
• Create, edit, and organize tasks effortlessly
• Set priorities (High, Medium, Low)
• Add due dates and time estimates
• Categorize with custom tags

🔄 Google Calendar Integration
• Two-way sync with Google Calendar
• View tasks alongside calendar events
• Automatic updates across devices

🔔 Smart Reminders
• Push notifications for upcoming tasks
• Email digests and weekly reports
• Customizable reminder times

🎯 Focus Mode
• Built-in Pomodoro timer
• Distraction-free work sessions
• Track your productivity

📱 Progressive Web App
• Works offline
• Install on any device
• Fast and responsive

🎨 Beautiful Design
• Clean, modern interface
• Dark mode support
• Smooth animations

🔐 Secure & Private
• Google OAuth authentication
• Your data is encrypted
• Privacy-focused design

Whether you're managing personal tasks, work projects, or team collaboration, DueSync provides all the tools you need to stay organized and productive.

Made with ❤️ by WIK Technologies
```

**App icon:** Upload 512x512 PNG

**Feature graphic:** Upload 1024x500 PNG

**Phone screenshots:** Upload at least 2

**Tablet screenshots:** Upload at least 2 (optional but recommended)

**Category:** Productivity

**Tags:** task management, todo, productivity, calendar, reminders

**Contact details:**
- Email: (your support email)
- Website: https://wiktechnologies.com
- Privacy policy: https://wiktechnologies.com/privacy-policy

---

## Step 11: Content Rating

Navigate to "Policy" → "App content" → "Content rating"

1. Start questionnaire
2. Select category: Productivity
3. Answer questions:
   - Violence: None
   - Sexual content: None
   - Profanity: None
   - Controlled substances: None
   - User interaction: Yes
   - Users can share info: Yes
   - Data collection: Yes

---

## Step 12: Upload App Bundle

### Production Release

1. Navigate to "Release" → "Production"
2. Click "Create new release"
3. Upload `app-release-bundle.aab`
4. Add release notes:

```
🎉 Initial release of DueSync!

Features:
• Smart task management with priorities
• Google Calendar sync
• Push notifications and reminders
• Focus mode with Pomodoro timer
• Offline support
• Beautiful, modern design
• Dark mode support

We're excited to help you boost your productivity!
```

---

## Step 13: Submit for Review

### Pre-submission Checklist

- [ ] Store listing complete
- [ ] Screenshots uploaded
- [ ] Privacy policy added
- [ ] Content rating complete
- [ ] App bundle uploaded
- [ ] Release notes added
- [ ] Pricing & distribution set

### Submit

1. Review all sections
2. Click "Send for review"
3. Wait for Google's review (typically 1-7 days)

---

## Post-Launch

### Monitor Performance

- Check crash reports in Play Console
- Monitor user reviews
- Track downloads and retention
- Respond to user feedback

### Updates

To release updates:

```bash
# Update version in twa-manifest.json
# Rebuild
bubblewrap build

# Upload new AAB to Play Console
```

---

## Troubleshooting

### Asset Links Not Verified

```bash
# Check if file is accessible
curl https://duesync.wiktechnologies.com/.well-known/assetlinks.json

# Verify SHA256 fingerprint matches
keytool -list -v -keystore duesync-release-key.keystore -alias duesync
```

### Build Fails

```bash
# Update Bubblewrap
npm update -g @bubblewrap/cli

# Clean and rebuild
bubblewrap build --skipPwaValidation
```

### App Opens in Browser

- Verify Digital Asset Links are deployed
- Check package name matches in assetlinks.json
- Wait 24 hours for Google to verify links

---

## Quick Reference

**Production URL:** https://duesync.wiktechnologies.com/  
**Package Name:** com.wiktechnologies.duesync  
**App Name:** DueSync  
**Keystore:** duesync-release-key.keystore  
**Alias:** duesync  

---

## Support

For issues or questions:
- Email: support@wiktechnologies.com
- Documentation: https://duesync.wiktechnologies.com/docs
- GitHub: (your repo URL)
