# 🧪 Complete Pipeline Testing Guide

This guide will help you test your entire agricultural pipeline to ensure it's working with real data instead of fallback data.

## 🚀 Quick Start

### Option 1: PowerShell (Recommended for Windows)
```powershell
.\test-pipeline.ps1
```

### Option 2: Batch File (Windows)
```cmd
test-pipeline.bat
```

### Option 3: Direct Node.js
```bash
node test-pipeline-complete.js
```

## 📋 What the Tests Cover

### 1. **API Health Checks**
- ✅ Predictions API (`/api/predictions`)
- ✅ Regions API (`/api/regions`) 
- ✅ Crops API (`/api/crops`)

### 2. **Weather & Location Services**
- ✅ Weather Service (`/api/weather`)
- ✅ Location Service (`/api/location`)

### 3. **NASA & Agricultural Data**
- ✅ NASA API (`/api/agri/nasa`)
- ✅ Agricultural insights and natural disasters

### 4. **Satellite & Pipeline Tests**
- ✅ Region Analysis Pipeline
- ✅ Farmer Analysis Pipeline
- ✅ Comprehensive Data Collection

### 5. **Additional Services**
- ✅ Image Analysis (`/api/image-analysis`)
- ✅ Weather Alerts (`/api/alerts`)
- ✅ Voice Assistant (`/api/voice`)

## 🔧 Prerequisites

### Required Software
- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **PowerShell** (Windows 10/11) or **Command Prompt**

### Required API Keys
The system needs these API keys to fetch real data:

#### 🌍 **Google Earth Engine** (Required for Satellite Images)
1. Go to [Google Earth Engine](https://developers.google.com/earth-engine/guides/service_account)
2. Create a service account
3. Download JSON credentials
4. Add to `.env.local`:
```bash
GOOGLE_EARTH_ENGINE_CLIENT_EMAIL=your_email@project.iam.gserviceaccount.com
GOOGLE_EARTH_ENGINE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----"
```

#### 🚀 **NASA API** (Required for Agricultural Insights)
1. Go to [NASA API Portal](https://api.nasa.gov/)
2. Generate API key
3. Add to `.env.local`:
```bash
NASA_API_KEY=your_nasa_api_key_here
```

#### 🌤️ **OpenWeather** (Required for Weather Data)
1. Go to [OpenWeather](https://openweathermap.org/api)
2. Generate API key
3. Add to `.env.local`:
```bash
OPENWEATHER_API_KEY=your_openweather_api_key_here
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key_here
```

#### 🗺️ **OpenCage** (Required for Geocoding)
1. Go to [OpenCage](https://opencagedata.com/)
2. Generate API key
3. Add to `.env.local`:
```bash
OPENCAGE_API_KEY=your_opencage_api_key_here
```

#### ⏰ **TimezoneDB** (Required for Timezone Data)
1. Go to [TimezoneDB](https://timezonedb.com/)
2. Generate API key
3. Add to `.env.local`:
```bash
TIMEZONE_API_KEY=your_timezone_api_key_here
```

## 📁 File Structure

```
sandip/
├── test-pipeline-complete.js      # Main test script
├── test-pipeline.ps1              # PowerShell wrapper
├── test-pipeline.bat              # Batch file wrapper
├── .env.local                     # Environment variables (create this)
├── SATELLITE_SETUP.md            # Satellite setup guide
└── PIPELINE_TESTING_README.md    # This file
```

## 🎯 Understanding Test Results

### ✅ **PASSED Tests**
- API endpoints are responding correctly
- Data is being returned in expected format
- Services are functioning properly

### ❌ **FAILED Tests**
- HTTP status codes other than 200-299
- API endpoints not responding
- Server errors or timeouts

### ⚠️ **Data Quality Indicators**

#### **Real Data Detected**
```
✅ Real data source detected
✅ Timestamp present
✅ Geographic coordinates present
✅ Meaningful data values present
✅ Metadata/interpretation present
```

#### **Fallback Data Detected**
```
⚠️ Fallback data detected (API keys may be missing)
⚠️ Placeholder values detected
⚠️ Demo data being used
```

## 🔍 Troubleshooting

### **Common Issues & Solutions**

#### 1. **Server Not Running**
```bash
# Start the development server
npm run dev
```

#### 2. **Missing Dependencies**
```bash
# Install dependencies
npm install
```

#### 3. **API Key Issues**
- Check `.env.local` file exists
- Verify API keys are not placeholder values
- Ensure API keys are valid and not expired
- Check API service status

#### 4. **Port Conflicts**
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID> /F
```

#### 5. **Environment Variables Not Loading**
- Restart your terminal/command prompt
- Ensure `.env.local` is in project root
- Check file encoding (should be UTF-8)

### **Debug Mode**
Enable detailed logging by setting in your environment:
```bash
DEBUG_GEE=true
DEBUG_NASA=true
DEBUG_WEATHER=true
```

## 📊 Interpreting Results

### **Success Indicators**
- All tests pass with 200 status codes
- Real API data sources detected
- Meaningful data values present
- No fallback data warnings

### **Warning Indicators**
- Some tests fail but system is functional
- Fallback data being used
- API rate limits reached
- Some services unavailable

### **Failure Indicators**
- Multiple tests failing
- Server not responding
- Database connection issues
- Critical services down

## 🚀 Running Specific Tests

### **Test Individual Endpoints**
```bash
# Test just the NASA API
curl "http://localhost:3000/api/agri/nasa?lat=19.7515&lon=75.7139"

# Test the pipeline
curl -X POST "http://localhost:3000/api/pipeline" \
  -H "Content-Type: application/json" \
  -d '{"farmerData":{"farmerId":"test","coordinates":{"lat":19.7515,"lon":75.7139}}}'
```

### **Test with Different Data**
Modify the test script to test different regions:
```javascript
// In test-pipeline-complete.js, change coordinates
coordinates: { lat: 28.7041, lon: 77.1025 } // Delhi
coordinates: { lat: 12.9716, lon: 77.5946 } // Bangalore
```

## 📈 Performance Monitoring

### **Response Time Analysis**
The test script measures:
- API response times
- Data processing speed
- Image generation time
- Overall pipeline performance

### **Data Volume Analysis**
- Number of data points collected
- Image resolution and quality
- Metadata completeness
- Geographic coverage

## 🔮 Advanced Testing

### **Load Testing**
```bash
# Test multiple concurrent requests
for i in {1..10}; do
  node test-pipeline-complete.js &
done
wait
```

### **Continuous Testing**
```bash
# Run tests every 5 minutes
while true; do
  node test-pipeline-complete.js
  sleep 300
done
```

### **Integration Testing**
The test script can be integrated with:
- CI/CD pipelines
- Automated monitoring
- Performance dashboards
- Alert systems

## 📚 Additional Resources

- [SATELLITE_SETUP.md](./SATELLITE_SETUP.md) - Detailed satellite setup
- [Google Earth Engine Documentation](https://developers.google.com/earth-engine)
- [NASA API Documentation](https://api.nasa.gov/)
- [OpenWeather API Documentation](https://openweathermap.org/api)

## 🆘 Getting Help

### **Check These First**
1. ✅ Server is running (`npm run dev`)
2. ✅ All dependencies installed (`npm install`)
3. ✅ `.env.local` file exists with valid API keys
4. ✅ No port conflicts
5. ✅ Internet connection working

### **Common Error Messages**
- `ECONNREFUSED` → Server not running
- `401 Unauthorized` → Invalid API key
- `429 Too Many Requests` → Rate limit exceeded
- `500 Internal Server Error` → Server-side issue

### **Next Steps After Testing**
1. **Fix any failed tests**
2. **Update API keys if needed**
3. **Verify real data is being fetched**
4. **Check satellite imagery quality**
5. **Validate weather data accuracy**

---

**🎯 Goal**: Achieve 100% test pass rate with real data sources detected!

**💡 Tip**: Run tests regularly to catch issues early and ensure your pipeline stays healthy.
