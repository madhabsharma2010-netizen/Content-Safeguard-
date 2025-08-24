# 📱 Native Mobile App Build Guide

Complete guide to build native APK (Android) and IPA (iOS) files for Content Safeguard Ultra.

## 🎯 Build Options Overview

### **Option 1: Expo Application Services (EAS) - Recommended**
- ✅ Modern, cloud-based build service
- ✅ Automatic code signing
- ✅ Easy app store deployment
- ✅ Built-in CI/CD pipeline

### **Option 2: Local Build (Advanced)**
- 🔧 Requires Android Studio/Xcode setup
- 🔧 Manual configuration needed
- 🔧 More control over build process

### **Option 3: Third-Party Services**
- 🌐 Alternative build platforms
- 💰 May have costs involved

---

## 🚀 Method 1: EAS Build (Recommended)

### **Prerequisites**
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account (create one if needed)
eas login
```

### **Step 1: Configure EAS**
```bash
cd /app/frontend

# Initialize EAS configuration
eas build:configure
```

This creates `eas.json` configuration file:
```json
{
  "cli": {
    "version": ">= 7.8.6"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### **Step 2: Configure App Details**
Edit `app.json`:
```json
{
  "expo": {
    "name": "Content Safeguard Ultra",
    "slug": "content-safeguard-ultra",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#007AFF"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.contentsafeguard.ultra"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#007AFF"
      },
      "package": "com.contentsafeguard.ultra",
      "versionCode": 1
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### **Step 3: Build Android APK**
```bash
# Build APK for Android
eas build --platform android --profile preview

# Or for production (requires Google Play signing)
eas build --platform android --profile production
```

### **Step 4: Build iOS IPA**
```bash
# Build IPA for iOS (requires Apple Developer Account)
eas build --platform ios --profile preview

# Or for production
eas build --platform ios --profile production
```

### **Step 5: Download Built Files**
```bash
# List your builds
eas build:list

# Download specific build
eas build:download [BUILD_ID]
```

---

## 🔧 Method 2: Local Build

### **Android Local Build**

#### **Prerequisites**
```bash
# Install Android Studio
# Download from: https://developer.android.com/studio

# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### **Build Process**
```bash
cd /app/frontend

# Prebuild for Android
npx expo prebuild --platform android

# Navigate to Android folder
cd android

# Build APK
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### **iOS Local Build**

#### **Prerequisites**
- macOS computer
- Xcode installed
- Apple Developer Account

#### **Build Process**
```bash
cd /app/frontend

# Prebuild for iOS
npx expo prebuild --platform ios

# Open in Xcode
open ios/ContentSafeguardUltra.xcworkspace

# Build in Xcode:
# 1. Select "Any iOS Device" as target
# 2. Product → Archive
# 3. Distribute App → Ad Hoc or App Store
```

---

## 📦 App Store Deployment

### **Google Play Store (Android)**

#### **Step 1: Prepare for Play Store**
```bash
# Build production APK/AAB
eas build --platform android --profile production
```

#### **Step 2: Upload to Play Console**
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app: "Content Safeguard Ultra"
3. Upload APK/AAB file
4. Fill app details:
   - **Title**: Content Safeguard Ultra
   - **Description**: Ultra-Accurate AI-Powered Content Monitoring & Filtering
   - **Category**: Tools
   - **Content Rating**: Everyone

#### **App Store Assets Needed:**
- **App Icon**: 512x512 PNG
- **Feature Graphic**: 1024x500 PNG
- **Screenshots**: Various device sizes
- **Privacy Policy URL**
- **App Description**

### **Apple App Store (iOS)**

#### **Step 1: Build for App Store**
```bash
# Build production IPA
eas build --platform ios --profile production
```

#### **Step 2: Upload to App Store Connect**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app: "Content Safeguard Ultra"
3. Upload IPA using Application Loader or Xcode
4. Fill app metadata and submit for review

---

## 🔑 Code Signing & Certificates

### **Android Signing**

#### **Generate Keystore**
```bash
# Generate upload keystore
keytool -genkey -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000

# Configure in eas.json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### **iOS Signing**
```bash
# Configure credentials with EAS
eas credentials:configure
```

---

## 📋 Pre-Build Checklist

### **Before Building:**
- [ ] Update version number in `app.json`
- [ ] Test app thoroughly on devices
- [ ] Verify all features work offline
- [ ] Check app permissions
- [ ] Optimize images and assets
- [ ] Update app description and metadata
- [ ] Prepare app store screenshots
- [ ] Write release notes

### **Required Assets:**
```
assets/
├── icon.png (1024x1024)
├── adaptive-icon.png (1024x1024)
├── splash.png (1242x2436)
└── favicon.png (48x48)
```

---

## ⚡ Optimization for Production

### **Performance Optimizations**
```javascript
// app.json optimizations
{
  "expo": {
    "assetBundlePatterns": [
      "assets/images/*",
      "assets/fonts/*"
    ],
    "ios": {
      "bundleIdentifier": "com.contentsafeguard.ultra",
      "buildNumber": "1.0.0"
    },
    "android": {
      "package": "com.contentsafeguard.ultra",
      "versionCode": 1,
      "permissions": [
        "INTERNET",
        "CAMERA",
        "READ_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

### **Bundle Optimization**
```bash
# Analyze bundle size
npx expo export --dump-sourcemap
npx expo-bundle-analyzer

# Optimize images
npm install -g expo-optimize
expo-optimize
```

---

## 🚀 Automated CI/CD Build Pipeline

### **GitHub Actions Setup**
Create `.github/workflows/build.yml`:

```yaml
name: Build Mobile App

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    name: Build Android & iOS
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: yarn
          cache-dependency-path: frontend/yarn.lock

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        working-directory: frontend
        run: yarn install --frozen-lockfile

      - name: Build Android
        working-directory: frontend
        run: eas build --platform android --non-interactive --profile preview

      - name: Build iOS
        working-directory: frontend
        run: eas build --platform ios --non-interactive --profile preview
```

---

## 📱 Direct Distribution (Without App Stores)

### **Android Direct Installation**
```bash
# Build APK
eas build --platform android --profile preview

# Install via ADB
adb install app-release.apk

# Or share APK file directly
# Users need to enable "Unknown sources"
```

### **iOS Direct Distribution (TestFlight)**
```bash
# Build and submit to TestFlight
eas build --platform ios --profile preview
eas submit --platform ios --latest
```

---

## 🔧 Troubleshooting Build Issues

### **Common Android Issues**

#### **Gradle Build Failed**
```bash
# Clear gradle cache
cd android
./gradlew clean

# Update gradle version
# Edit android/gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.0-all.zip
```

#### **Memory Issues**
```bash
# Increase heap size
export GRADLE_OPTS="-Xmx4096m -XX:MaxPermSize=512m"
```

### **Common iOS Issues**

#### **Code Signing Issues**
```bash
# Reset credentials
eas credentials:configure --platform ios

# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

#### **Provisioning Profile Issues**
1. Delete old profiles in Xcode
2. Regenerate with EAS: `eas credentials:configure`
3. Clean and rebuild project

---

## 💡 Build Tips & Best Practices

### **Performance Tips**
- Use `--profile preview` for testing builds
- Use `--profile production` for store releases
- Enable tree-shaking for smaller bundles
- Optimize images before building
- Use bundle splitting for large apps

### **Security Tips**
- Never commit signing keys to git
- Use environment variables for secrets
- Enable app signing by Google Play
- Use Apple's automatic signing

### **Testing Tips**
- Test on physical devices before release
- Use internal app sharing for quick testing
- Test offline functionality
- Verify push notifications work
- Check deep linking functionality

---

## 📊 Build Size Optimization

### **Reduce APK/IPA Size**
```bash
# Enable Hermes (Android)
# In app.json
{
  "expo": {
    "android": {
      "jsEngine": "hermes"
    }
  }
}

# Enable ProGuard (Android)
{
  "android": {
    "proguardDebugVariant": "release"
  }
}

# iOS Bitcode optimization
{
  "ios": {
    "bitcode": "Debug"
  }
}
```

---

## 🎯 Final Steps

### **After Successful Build**
1. **Download APK/IPA** files
2. **Test on physical devices**
3. **Upload to app stores** or distribute directly
4. **Monitor crash reports**
5. **Gather user feedback**
6. **Plan next update**

### **Distribution Options**
- **Google Play Store** (Recommended for Android)
- **Apple App Store** (Recommended for iOS)
- **Direct APK download** (Android only)
- **TestFlight** (iOS beta testing)
- **Firebase App Distribution** (Internal testing)

---

**🎉 Congratulations! आपका Content Safeguard Ultra अब native mobile app के रूप में तैयार है!**

*Users can now download and install your AI-powered content filtering app directly on their phones!* 📱🛡️