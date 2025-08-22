# PredictAgri 🌱

**Advanced Agriculture Intelligence Platform** - Comprehensive crop yield prediction, satellite data analysis, and agricultural insights powered by Next.js 19, Google Earth Engine, NASA APIs, and Supabase.

## ✨ **Core Features**

### 🌾 **Crop Yield Prediction System**
- **Advanced ML-based predictions** with real-time environmental data
- **Multi-factor analysis** including soil composition, weather, and satellite data
- **Risk assessment** with comprehensive scoring algorithms
- **Bulk prediction generation** for testing multiple scenarios
- **Historical prediction tracking** with performance analytics

### 🛰️ **Satellite Data & Earth Observation**
- **Google Earth Engine Integration** for comprehensive satellite data
- **NDVI Analysis** - Vegetation health and density monitoring
- **Land Surface Temperature** mapping and analysis
- **Soil Composition Analysis** - Moisture, pH, organic carbon, texture
- **Land Use Classification** using ESA WorldCover data
- **Vegetation Health Index (VHI)** calculations

### 🌤️ **Real-Time Weather & Climate Data**
- **OpenMeteo Integration** for current weather conditions
- **Historical weather patterns** and trend analysis
- **Climate risk assessment** for agricultural planning
- **Weather-based crop recommendations**

### 🚀 **NASA Agricultural Intelligence**
- **EONET Natural Disasters** monitoring and alerts
- **Earth imagery** for crop monitoring and analysis
- **EPIC satellite imagery** for agricultural insights
- **Agricultural risk assessment** from natural events
- **Weather event analysis** and impact assessment

### 🎤 **Voice-Powered Assistant**
- **Speech Recognition** for hands-free operation
- **Voice Commands** for data queries and analysis
- **Location-aware responses** with GPS integration
- **Natural language processing** for agricultural queries

### 🔍 **Image Analysis & Computer Vision**
- **OpenCV Integration** for crop image analysis
- **Disease detection** and plant health assessment
- **Growth stage analysis** and yield estimation
- **Automated pipeline** for batch image processing

### 📊 **Comprehensive Dashboard & Analytics**
- **Real-time monitoring** of all agricultural metrics
- **Interactive charts** and data visualization
- **Multi-region comparison** and analysis
- **Performance tracking** and trend analysis

## 🚀 **Quick Start**

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Set up Supabase Database**
#### Step 2.1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be set up (usually takes 1-2 minutes)

#### Step 2.2: Run Database Migration
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-migration.sql`
3. Paste it into the SQL Editor and click **Run**
4. This will create all tables, indexes, and insert sample data

#### Step 2.3: Get API Credentials
1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the **Project URL** and **anon public** key

### 3. **Configure Environment Variables**

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# NASA API Configuration
NASA_API_KEY=your-nasa-api-key-here

# Google Earth Engine Configuration (Optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=your-private-key-here
GOOGLE_PROJECT_ID=your-project-id

# Twilio Configuration (Optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Debug Configuration
DEBUG=google-earth-engine
EE_DEBUG=1
```

### 4. **Run the Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 **Project Architecture**

```
predictagri/
├── app/
│   ├── components/
│   │   ├── Navigation.js                    # Main navigation
│   │   ├── WeatherPanel.js                  # Real-time weather display
│   │   ├── NasaPanel.js                     # NASA data and insights
│   │   ├── VoicePanel.js                    # Voice assistant interface
│   │   ├── SatelliteDataDashboard.js        # Satellite data visualization
│   │   ├── ImageAnalysisDashboard.js        # Image analysis interface
│   │   ├── RealWeatherWidget.js             # Weather widget with storage
│   │   ├── EnhancedFarmerAnalysis.js        # Advanced farmer analytics
│   │   ├── AgriPipelinePanel.js             # Agricultural pipeline
│   │   ├── AlertsPanel.js                   # Risk alerts and notifications
│   │   └── Charts.js                        # Data visualization components
│   ├── api/
│   │   ├── predictions/route.js             # Crop yield predictions
│   │   ├── regions/route.js                 # Geographic regions
│   │   ├── crops/route.js                   # Crop management
│   │   ├── weather/route.js                 # Weather data & storage
│   │   ├── satellite/route.js               # Satellite data & storage
│   │   ├── image-analysis/route.js          # Image analysis & storage
│   │   ├── agri/nasa/route.js               # NASA agricultural data
│   │   ├── farmer-analysis/route.js         # Farmer analytics
│   │   ├── alerts/route.js                  # Risk alerts
│   │   ├── pipeline/route.js                # Agricultural pipeline
│   │   └── voice/route.js                   # Voice assistant backend
│   ├── regions/page.js                      # Regions management
│   ├── crops/page.js                        # Crops management
│   ├── predictions/page.js                  # Predictions interface
│   ├── image-analysis/page.js               # Image analysis page
│   ├── page.js                              # Main dashboard
│   └── layout.js                            # Root layout
├── lib/
│   ├── supabaseClient.js                    # Supabase configuration
│   ├── locationService.js                   # GPS & IP location detection
│   ├── weatherService.js                    # OpenMeteo weather API
│   ├── nasaDataService.js                   # NASA APIs integration
│   ├── googleEarthEngineService.js          # Google Earth Engine
│   ├── imageProcessingService.js            # OpenCV image analysis
│   ├── automatedPipeline.js                 # Automated analysis pipeline
│   ├── enhancedAutomatedPipeline.js         # Enhanced pipeline
│   ├── farmerLocationService.js             # Farmer location services
│   ├── twilioService.js                     # SMS notifications
│   ├── voiceAssistant.js                    # Voice processing
│   └── logger.js                            # Structured logging
├── supabase-migration.sql                   # Complete database schema
├── tests/                                   # Test files
└── public/                                  # Static assets
```

## 🗄️ **Database Schema**

### **Core Tables**

1. **regions** - Geographic regions with comprehensive data
   - `id` (UUID, Primary Key)
   - `name` (Text)
   - `lat`, `lon` (Coordinates)
   - `soil_n`, `soil_p`, `soil_k` (NPK values)
   - `ph` (Soil pH)
   - `created_at` (Timestamp)

2. **crops** - Available crop types and seasons
   - `id` (UUID, Primary Key)
   - `name` (Text)
   - `season` (Text: Rabi/Kharif/Year-round)

3. **predictions** - Crop yield predictions with ML features
   - `id` (UUID, Primary Key)
   - `user_id` (UUID)
   - `crop_id` (UUID, Foreign Key to crops)
   - `region_id` (UUID, Foreign Key to regions)
   - `features` (JSONB - comprehensive input features)
   - `yield` (Numeric - predicted yield)
   - `risk_score` (Numeric - risk probability)
   - `created_at` (Timestamp)

4. **alerts** - Risk alerts and notifications
   - `id` (UUID, Primary Key)
   - `prediction_id` (UUID, Foreign Key to predictions)
   - `type` (Text - alert type)
   - `message` (Text - alert message)
   - `sent_at` (Timestamp)

### **Data Storage Tables**

5. **weather_data** - Historical weather data storage
   - `id` (UUID, Primary Key)
   - `region_id` (UUID, Foreign Key to regions)
   - `weather_data` (JSONB - comprehensive weather data)
   - `timestamp` (Timestamp)

6. **satellite_data** - Satellite imagery and analysis data
   - `id` (UUID, Primary Key)
   - `region_id` (UUID, Foreign Key to regions)
   - `data_type` (Text - NDVI, temperature, soil, etc.)
   - `satellite_data` (JSONB - satellite analysis results)
   - `timestamp` (Timestamp)

7. **image_analysis_results** - Computer vision analysis results
   - `id` (UUID, Primary Key)
   - `image_metadata` (JSONB - image information)
   - `analysis_result` (JSONB - analysis output)
   - `timestamp` (Timestamp)

## 🔌 **API Endpoints**

### **Core Agricultural APIs**
- `GET /api/predictions` - Get recent predictions
- `POST /api/predictions` - Create new prediction
- `GET /api/regions` - Get all regions
- `POST /api/regions` - Create new region
- `GET /api/crops` - Get all crops
- `POST /api/crops` - Create new crop

### **Weather & Climate APIs**
- `GET /api/weather` - Get current weather data
- `POST /api/weather/store` - Store weather data for analysis

### **Satellite & Earth Observation APIs**
- `GET /api/satellite` - Get satellite data for regions
- `POST /api/satellite/store` - Store satellite analysis results
- `GET /api/satellite?action=history` - Get historical satellite data

### **Image Analysis APIs**
- `POST /api/image-analysis` - Analyze crop images
- `GET /api/image-analysis` - Get analysis status
- `POST /api/image-analysis/store` - Store analysis results

### **NASA & External APIs**
- `GET /api/agri/nasa` - Get NASA agricultural insights
- `GET /api/farmer-analysis` - Get comprehensive farmer analytics

### **Voice & Communication APIs**
- `POST /api/voice` - Process voice commands and queries

## 🌍 **Data Integration Systems**

### **Google Earth Engine Integration**
- **NDVI Data**: MODIS vegetation health monitoring
- **Land Surface Temperature**: MODIS thermal data analysis
- **Soil Analysis**: SMAP moisture, SoilGrids composition
- **Land Use**: ESA WorldCover classification
- **Comprehensive Data**: Multi-source agricultural insights

### **NASA Data Integration**
- **EONET**: Natural disaster monitoring and alerts
- **Earth Imagery**: High-resolution satellite imagery
- **EPIC**: Daily Earth photography
- **Agricultural Insights**: Risk assessment and recommendations

### **Weather Data Integration**
- **OpenMeteo**: Real-time weather conditions
- **Historical Patterns**: Climate trend analysis
- **Risk Assessment**: Weather-based crop recommendations

### **Location Services**
- **GPS Integration**: Precise location detection
- **IP Geolocation**: Fallback location services
- **Address Resolution**: Geographic coordinate conversion

## 🎯 **Usage Workflow**

### **1. Initial Setup**
1. **Database Migration**: Run `supabase-migration.sql` in Supabase
2. **Environment Configuration**: Set up all API keys and credentials
3. **Sample Data**: System automatically populates with realistic agricultural data

### **2. Agricultural Analysis**
1. **Region Selection**: Choose from 8 sample regions or add custom regions
2. **Crop Selection**: Select from 12 sample crops with proper seasons
3. **Data Collection**: System fetches real-time weather, satellite, and soil data
4. **Analysis**: Comprehensive analysis using Google Earth Engine and NASA data
5. **Prediction**: ML-based yield prediction with risk assessment

### **3. Real-Time Monitoring**
1. **Weather Tracking**: Continuous weather monitoring and alerts
2. **Satellite Monitoring**: Regular NDVI and temperature updates
3. **Risk Assessment**: Continuous risk scoring and alert generation
4. **Performance Tracking**: Historical data analysis and trend identification

### **4. Advanced Features**
1. **Voice Commands**: Use voice for hands-free data queries
2. **Image Analysis**: Upload crop images for disease detection
3. **Historical Analysis**: Track changes over time with stored data
4. **Bulk Operations**: Generate multiple predictions for testing

## 🛠️ **Technical Stack**

### **Frontend**
- **Next.js 19** with App Router
- **React 19** with modern hooks
- **Tailwind CSS** for responsive design
- **Web Speech API** for voice integration

### **Backend & APIs**
- **Supabase** for database and real-time features
- **Google Earth Engine** for satellite data analysis
- **NASA APIs** for agricultural intelligence
- **OpenMeteo** for weather data
- **OpenCV** for image analysis

### **Data Processing**
- **PostgreSQL** with JSONB support
- **Real-time subscriptions** for live updates
- **Automated pipelines** for data processing
- **Fallback systems** for API failures

### **Deployment & Infrastructure**
- **Vercel-ready** deployment
- **Environment-based** configuration
- **Comprehensive logging** and monitoring
- **Error handling** and fallback mechanisms

## 🧪 **Testing & Development Features**

### **Real Data Integration**
- **8 Sample Regions** with realistic soil and climate data
- **12 Sample Crops** with proper seasonal classifications
- **Comprehensive Predictions** with feature-based calculations
- **Risk Assessment** based on environmental factors
- **Bulk Generation** for testing multiple scenarios

### **Fallback Systems**
- **API Failure Handling** with graceful degradation
- **Mock Data Generation** when external services are unavailable
- **Error Recovery** with automatic retry mechanisms
- **Service Monitoring** with comprehensive logging

### **Development Tools**
- **Structured Logging** with emoji prefixes for easy identification
- **Debug Modes** for Google Earth Engine and other services
- **Comprehensive Error Handling** with detailed context
- **Performance Monitoring** with API call tracking

## 🚀 **Deployment**

### **Vercel Deployment**
1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically with CI/CD

### **Environment Variables for Production**
Ensure all environment variables are properly configured in your production environment, especially:
- Supabase credentials
- NASA API key
- Google Earth Engine credentials (if using)
- Twilio credentials (if using SMS notifications)

## 📈 **Current Status & Roadmap**

### **✅ Implemented Features**
- Complete agricultural prediction system
- Google Earth Engine integration
- NASA data integration
- Voice-powered assistant
- Image analysis capabilities
- Real-time weather monitoring
- Comprehensive data storage
- Risk assessment algorithms
- Multi-region support
- Advanced analytics dashboard

### **🔄 In Development**
- Enhanced ML model integration
- Real-time alert notifications
- Advanced data visualization
- Mobile app development
- API rate limiting optimization

### **📋 Future Enhancements**
- **ONNX Model Integration** - Replace fallback predictions with real ML models
- **User Authentication** - Add Supabase Auth for user management
- **Real-time Alerts** - Implement WebSocket notifications
- **Advanced Visualization** - Add interactive charts and graphs
- **Mobile App** - React Native companion app
- **Export Features** - PDF/Excel report generation
- **Machine Learning Pipeline** - Automated model training and deployment

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes with comprehensive testing
4. Ensure all logging and error handling is properly implemented
5. Submit a pull request with detailed description

## 📄 **License**

This project is licensed under the MIT License.

---

**🌱 Built with ❤️ for the future of agriculture**

*PredictAgri - Transforming agriculture through intelligent data analysis and predictive insights*