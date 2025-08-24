# 🚀 Getting Started with Content Safeguard Ultra

Welcome to Content Safeguard Ultra! This guide will help you get up and running with our AI-powered content filtering system in just a few minutes.

## 📱 Quick Start - Try the App

### **Option 1: Live Demo (Fastest)**
1. **Open on your mobile device**: https://mobile-safeguard.preview.emergentagent.com
2. **Add to Home Screen** for native app experience
3. **Start analyzing content** immediately!

### **Option 2: Development Setup**
Follow this guide to set up the development environment on your local machine.

---

## 🛠️ Development Installation

### **Prerequisites**

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.9 or higher) - [Download here](https://python.org/)
- **Git** - [Download here](https://git-scm.com/)
- **MongoDB** - [Download here](https://www.mongodb.com/try/download/community)
- **Yarn** package manager: `npm install -g yarn`
- **Expo CLI**: `npm install -g @expo/cli`

### **System Requirements**
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Stable internet connection for AI API calls

---

## 📦 Installation Steps

### **1. Clone the Repository**
```bash
# Clone the repository
git clone https://github.com/your-username/content-safeguard-ultra.git
cd content-safeguard-ultra
```

### **2. Backend Setup**

#### **Install Python Dependencies**
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Emergent Integrations (for AI functionality)
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

#### **Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
```bash
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="content_safeguard"

# AI Integration (automatically configured)
EMERGENT_LLM_KEY=sk-emergent-508E721276cAd009cE

# Payment Processing (optional for development)
STRIPE_API_KEY=your_stripe_key_here
```

#### **Start Backend Server**
```bash
# From the backend directory
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

### **3. Frontend Setup**

#### **Install Dependencies** (New Terminal)
```bash
cd frontend

# Install dependencies
yarn install
```

#### **Configure Environment**
```bash
# Copy environment template
cp .env.example .env

# The .env should contain:
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

#### **Start Expo Development Server**
```bash
# From the frontend directory
expo start
```

You should see:
```
Starting project at /path/to/content-safeguard-ultra/frontend
Starting Metro Bundler
Metro is running on http://localhost:3000
Expo DevTools is running on http://localhost:19002
```

### **4. Database Setup**

#### **Start MongoDB**
```bash
# On macOS with Homebrew:
brew services start mongodb-community

# On Ubuntu/Debian:
sudo systemctl start mongod

# On Windows:
net start MongoDB
```

#### **Verify Database Connection**
```bash
# Connect to MongoDB shell
mongo

# Check databases
show dbs

# Create our database (optional, will be created automatically)
use content_safeguard
```

---

## 📱 Running the Application

### **Access the Application**

1. **Web Browser**: Open http://localhost:3000
2. **Mobile Device**: 
   - Install Expo Go app from App Store/Google Play
   - Scan the QR code shown in your terminal
3. **iOS Simulator**: Press `i` in the Expo terminal
4. **Android Emulator**: Press `a` in the Expo terminal

### **First Time Setup**

1. **Launch the app** using any of the methods above
2. **Test Content Analysis**:
   - Enter some text in the analysis box
   - Select a platform source (e.g., WhatsApp)
   - Click "Ultra-Accurate Analysis"
   - Wait for AI processing (usually <30 seconds)
   - View your detailed results with accuracy metrics

3. **Configure Settings**:
   - Go to Settings tab
   - Adjust filter categories as needed
   - Set your preferred strictness level
   - Add custom keywords if desired

4. **View Statistics**:
   - Check the Ultra Stats tab
   - Monitor your analysis history
   - Track accuracy metrics

---

## 🧪 Testing the Installation

### **Backend API Test**
```bash
# Test health endpoint
curl http://localhost:8001/api/health

# Expected response:
{
  "status": "healthy",
  "service": "Content Safeguard Pro - Ultra Accurate",
  "version": "3.0.0",
  "accuracy_target": "95%+",
  "min_confidence": "85%"
}
```

### **Content Analysis Test**
```bash
# Test content analysis
curl -X POST http://localhost:8001/api/ultra-analyze-content \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test message for content analysis",
    "content_type": "text",
    "require_high_accuracy": true
  }'
```

### **Frontend Test**
1. Open the app in your browser or mobile device
2. Navigate to the "Ultra Analyze" tab
3. Enter test content: "This is safe educational content about science"
4. Click "Ultra-Accurate Analysis"
5. Verify you get results with 90%+ accuracy score

---

## 🔧 Troubleshooting

### **Common Issues**

#### **Backend Won't Start**
```bash
# Check if Python virtual environment is activated
which python
# Should show path to venv/bin/python

# Check if all dependencies are installed
pip list | grep fastapi
pip list | grep emergentintegrations

# Check if port 8001 is available
lsof -i :8001
```

#### **Frontend Build Errors**
```bash
# Clear Expo cache
expo r -c

# Clear node modules and reinstall
rm -rf node_modules
yarn install

# Check Expo CLI version
expo --version
# Should be latest version
```

#### **Database Connection Issues**
```bash
# Check MongoDB status
# On macOS:
brew services list | grep mongodb

# On Ubuntu:
sudo systemctl status mongod

# Test connection
mongo --eval "db.runCommand({connectionStatus : 1})"
```

#### **AI Analysis Not Working**
```bash
# Check backend logs for errors
tail -f logs/backend.log

# Verify environment variables
echo $EMERGENT_LLM_KEY

# Test API key manually
curl -X POST http://localhost:8001/api/ultra-analyze-content \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "content_type": "text"}'
```

### **Performance Issues**

#### **Slow Analysis**
- Check internet connection (AI APIs require stable connection)
- Monitor backend logs for timeout errors
- Consider increasing timeout in settings

#### **Mobile App Slow**
- Ensure you're running on a physical device or good emulator
- Clear Expo cache: `expo r -c`
- Check network connection

---

## 🎯 Next Steps

### **For Users**
1. **Explore Features**: Try different content types and sources
2. **Customize Settings**: Adjust filters to your preferences
3. **Monitor Statistics**: Track your protection metrics
4. **Upgrade**: Consider Premium features for unlimited analysis

### **For Developers**
1. **Read the Code**: Explore the codebase structure
2. **Run Tests**: Execute the test suite
3. **Make Changes**: Try modifying features
4. **Contribute**: Check our [Contributing Guide](../CONTRIBUTING.md)

### **For Businesses**
1. **Test Enterprise Features**: Try admin dashboard features
2. **API Integration**: Explore programmatic access
3. **Custom Deployment**: Consider private cloud deployment
4. **Contact Sales**: Discuss enterprise licensing

---

## 📚 Additional Resources

### **Documentation**
- [📋 Project Roadmap](../ROADMAP.md)
- [🏗️ Architecture Guide](architecture.md)
- [🔌 API Reference](api-reference.md)
- [💼 Business Model](business-model.md)
- [🔒 Security Guide](security.md)

### **Community**
- [💬 Discord Community](https://discord.gg/content-safeguard)
- [🐛 Issue Tracker](https://github.com/your-username/content-safeguard-ultra/issues)
- [📧 Email Support](mailto:support@contentsafeguard.com)
- [🐦 Twitter Updates](https://twitter.com/ContentSafeguardAI)

### **Development Resources**
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [MongoDB Docs](https://docs.mongodb.com/)

---

## ❓ Need Help?

If you encounter any issues not covered in this guide:

1. **Check our FAQ**: [Frequently Asked Questions](faq.md)
2. **Search Issues**: [GitHub Issues](https://github.com/your-username/content-safeguard-ultra/issues)
3. **Ask Community**: [Discord #help channel](https://discord.gg/content-safeguard)
4. **Contact Support**: [support@contentsafeguard.com](mailto:support@contentsafeguard.com)

---

**🎉 Congratulations! You now have Content Safeguard Ultra running locally.**

*Ready to make the internet a safer place with AI-powered content filtering!* 🛡️