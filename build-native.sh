#!/bin/bash

# Content Safeguard Ultra - Native App Build Script
# This script helps you build native mobile apps (APK for Android, IPA for iOS)

echo "🛡️  Content Safeguard Ultra - Native App Builder"
echo "=================================================="
echo ""

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

cd frontend

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    print_warning "EAS CLI not found. Installing..."
    npm install -g eas-cli
    print_status "EAS CLI installed successfully"
fi

echo ""
echo "Select build option:"
echo "1. 📱 Build Android APK (Preview)"
echo "2. 🍎 Build iOS IPA (Preview)"  
echo "3. 📦 Build Both Platforms"
echo "4. 🏪 Production Build (App Store Ready)"
echo "5. ⚙️  Configure EAS (First Time Setup)"
echo "6. 📋 Show Build Status"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        print_info "Building Android APK..."
        echo ""
        print_warning "This will create a preview APK that can be installed directly"
        print_info "Build time: ~10-15 minutes"
        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            eas build --platform android --profile preview
            print_status "Android build started! Check your Expo dashboard for progress."
            print_info "Download link will be available after build completion"
        fi
        ;;
    
    2)
        print_info "Building iOS IPA..."
        echo ""
        print_warning "This requires an Apple Developer Account"
        print_info "Build time: ~15-20 minutes"
        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            eas build --platform ios --profile preview
            print_status "iOS build started! Check your Expo dashboard for progress."
        fi
        ;;
    
    3)
        print_info "Building both Android and iOS..."
        echo ""
        print_warning "This will build both platforms simultaneously"
        print_info "Total build time: ~20-25 minutes"
        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            eas build --platform all --profile preview
            print_status "Multi-platform build started!"
        fi
        ;;
    
    4)
        print_info "Production builds for app stores..."
        echo ""
        print_warning "This creates app store ready builds"
        print_info "Requires proper signing certificates"
        echo ""
        echo "Select platform:"
        echo "  a) Android (Google Play)"
        echo "  b) iOS (App Store)"
        echo "  c) Both platforms"
        read -p "Enter choice (a/b/c): " platform
        
        case $platform in
            a)
                eas build --platform android --profile production
                ;;
            b)  
                eas build --platform ios --profile production
                ;;
            c)
                eas build --platform all --profile production
                ;;
            *)
                print_error "Invalid platform selection"
                exit 1
                ;;
        esac
        print_status "Production build started!"
        ;;
    
    5)
        print_info "Setting up EAS configuration..."
        echo ""
        
        # Check if user is logged in
        if ! eas whoami &> /dev/null; then
            print_warning "Please login to your Expo account:"
            eas login
        fi
        
        # Initialize EAS config
        if [ ! -f "eas.json" ]; then
            print_info "Initializing EAS configuration..."
            eas build:configure
            print_status "EAS configuration created!"
        else
            print_warning "EAS already configured. Updating..."
            eas build:configure
        fi
        
        print_status "EAS setup complete!"
        print_info "You can now run builds using options 1-4"
        ;;
    
    6)
        print_info "Fetching build status..."
        eas build:list --limit=10
        echo ""
        print_info "To download a completed build:"
        print_info "eas build:download [BUILD_ID]"
        ;;
    
    *)
        print_error "Invalid choice. Please select 1-6."
        exit 1
        ;;
esac

echo ""
print_info "Build commands completed!"
print_info "Monitor build progress at: https://expo.dev/accounts/[your-account]/projects/content-safeguard-ultra/builds"

# Show additional helpful information
echo ""
echo "📱 Additional Information:"
echo "========================"
echo ""
echo "🔍 Check build status:"
echo "   eas build:list"
echo ""
echo "📥 Download completed build:"
echo "   eas build:download [BUILD_ID]"
echo ""
echo "🚀 Submit to app stores:"
echo "   eas submit --platform android"
echo "   eas submit --platform ios"
echo ""
echo "📊 View build details:"
echo "   Visit: https://expo.dev/accounts/[your-account]/projects/content-safeguard-ultra"
echo ""

# Show QR code for current live version
echo "📱 Test current web version:"
echo "   https://mobile-safeguard.preview.emergentagent.com"
echo ""

print_status "Happy building! 🛡️📱"