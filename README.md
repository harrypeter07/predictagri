# 🌾 PredictAgri - AI-Powered Agricultural Prediction Platform

A comprehensive agricultural prediction platform that leverages machine learning, satellite data, and real-time weather information to provide accurate crop yield predictions and farming insights.

## 🚀 Architecture

### Frontend (Next.js on Vercel)
- **UI Components**: React-based dashboard with dark theme
- **API Integration**: RESTful API calls to backend services
- **Real-time Data**: Weather, satellite, and agricultural data visualization
- **Voice Assistant**: Web Speech API integration for hands-free operation

### Backend (Node.js on Render)
- **ML Inference**: ONNX model execution for crop yield prediction
- **Model Management**: Automatic model loading and schema validation
- **REST API**: `/predict`, `/schema`, `/health` endpoints
- **Scalability**: Dedicated server for high-performance inference

## 🛠️ Technical Stack

- **Frontend**: Next.js 15.5.0 with React 19.1.0
- **Styling**: Tailwind CSS 4.0
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **ML/AI**: ONNX Runtime (Backend inference on Render)
- **APIs**: Google Earth Engine, NASA APIs, OpenWeatherMap
- **Image Processing**: OpenCV.js, Jimp
- **Charts**: Chart.js with React Chart.js 2
- **Voice**: Web Speech API
- **Deployment**: Vercel (Frontend), Render (Backend)

## 🌟 Core Features

### 1. **Crop Yield Prediction**
- **ONNX Model**: Pre-trained machine learning model for yield prediction
- **Real-time Features**: Soil data, weather conditions, crop type, season
- **Backend Processing**: High-performance inference on dedicated server
- **Fallback System**: ML-based calculations when model unavailable

### 2. **Satellite Data Integration**
- **Google Earth Engine**: Soil moisture, land surface temperature, NDVI
- **NASA APIs**: EONET disasters, APOD, EPIC imagery
- **Historical Data**: Time-series analysis and trend visualization
- **Real-time Monitoring**: Live satellite data updates

### 3. **Weather Intelligence**
- **OpenWeatherMap**: Current and forecasted weather data
- **Location-based**: GPS and IP-based location detection
- **Agricultural Focus**: Temperature, humidity, precipitation analysis
- **Alert System**: Weather-based farming recommendations

### 4. **Image Analysis**
- **OpenCV Integration**: Crop health analysis, disease detection
- **Upload Support**: Multiple image formats (JPEG, PNG, WebP)
- **AI Processing**: Automated feature extraction and analysis
- **Results Storage**: Database persistence for historical tracking

### 5. **Voice Assistant**
- **Speech Recognition**: Voice input for queries and commands
- **Natural Language**: Context-aware agricultural responses
- **Location Integration**: GPS-based personalized recommendations
- **Hands-free Operation**: Complete voice-controlled interface

### 6. **Data Management**
- **Regions**: Geographic area management with soil data
- **Crops**: Agricultural crop database with seasonal information
- **Predictions**: Historical prediction tracking and analysis
- **Alerts**: Automated notification system for farming insights

## 📊 Data Processing

### Real-time Data Sources
- **Weather APIs**: OpenWeatherMap, OpenMeteo
- **Satellite Data**: Google Earth Engine, NASA EOSDIS
- **Soil Information**: SoilGrids, regional soil databases
- **Agricultural Data**: Crop calendars, seasonal patterns

### Database Schema
- **regions**: Geographic areas with soil and climate data
- **crops**: Agricultural crops with seasonal information
- **predictions**: ML model predictions with features and results
- **weather_data**: Historical weather information
- **satellite_data**: Satellite imagery and derived products
- **image_analysis_results**: Image processing outcomes
- **alerts**: Automated farming recommendations

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Earth Engine access (optional)
- Render account (for backend deployment)

### Frontend Setup
```bash
# Clone the repository
git clone <repository-url>
cd sandip

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your actual values

# Run development server
npm run dev
```

### Backend Setup (Render)
1. **Deploy Backend**: Upload backend code to Render
2. **Environment Variables**: Set `PORT` and CORS origins
3. **Model Files**: Ensure ONNX model and schema are accessible
4. **Health Check**: Verify `/health` endpoint responds

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend Configuration (Render)
NEXT_PUBLIC_BACKEND_URL=https://your-render-backend-url.onrender.com
BACKEND_URL=https://your-render-backend-url.onrender.com

# Weather API Configuration
OPENWEATHER_API_KEY=your_openweather_api_key

# NASA API Configuration
NASA_API_KEY=your_nasa_api_key

# Google Earth Engine Configuration
GOOGLE_EARTH_ENGINE_PRIVATE_KEY=your_google_earth_engine_private_key
GOOGLE_EARTH_ENGINE_CLIENT_EMAIL=your_google_earth_engine_client_email

# Twilio Configuration (for voice alerts)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Build the application
npm run build

# Deploy to Vercel
vercel --prod
```

### Backend (Render)
1. **Create Service**: New Web Service on Render
2. **Connect Repository**: Link your backend code
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Environment**: Set required environment variables

## 📈 API Endpoints

### Frontend API Routes
- `GET /api/predictions` - Retrieve recent predictions
- `POST /api/predictions` - Create new prediction
- `GET /api/weather` - Fetch weather data
- `POST /api/weather/store` - Store weather data
- `GET /api/satellite` - Fetch satellite data
- `POST /api/satellite/store` - Store satellite data
- `POST /api/image-analysis` - Analyze uploaded images
- `POST /api/image-analysis/store` - Store analysis results

### Backend API Routes (Render)
- `GET /health` - Backend health check
- `POST /predict` - Run ONNX model prediction
- `GET /schema` - Get model feature schema
- `GET /model-info` - Model status and information

## 🧪 Testing & Development

### ONNX Model Testing
- **Test Page**: `/onnx-test` - Direct model testing interface
- **Schema Validation**: Automatic feature validation
- **Backend Health**: Real-time connection status
- **Sample Data**: Pre-configured test scenarios

### Development Features
- **Hot Reload**: Next.js development server
- **Error Logging**: Comprehensive error tracking
- **Fallback Data**: Graceful degradation when APIs unavailable
- **Mock Data Generation**: Development and testing support

## 🔍 Key Components

### Core Services
- **LocationService**: GPS and IP-based location detection
- **WeatherService**: Multi-source weather data aggregation
- **GoogleEarthEngineService**: Satellite data processing
- **NasaDataService**: NASA API integration
- **ImageProcessingService**: OpenCV-based image analysis
- **VoiceAssistant**: Web Speech API integration

### UI Components
- **Navigation**: Responsive navigation with dark theme
- **WeatherPanel**: Real-time weather display
- **SatelliteDataDashboard**: Satellite imagery and data
- **ImageAnalysisDashboard**: Image upload and analysis
- **VoicePanel**: Voice-controlled interface
- **Charts**: Data visualization components

## 📱 User Interface

### Dark Theme Design
- **Consistent Styling**: Dark backgrounds with light text
- **Modern UI**: Clean, professional agricultural interface
- **Responsive Design**: Mobile and desktop optimized
- **Accessibility**: High contrast and readable fonts

### Navigation Structure
- **Dashboard**: Main overview and quick actions
- **Regions**: Geographic area management
- **Crops**: Agricultural crop database
- **Predictions**: ML model predictions and history
- **Image Analysis**: Upload and analyze images
- **ONNX Test**: Direct model testing interface

## 🔒 Security & Performance

### Security Features
- **Row Level Security**: Supabase database policies
- **API Rate Limiting**: Request throttling and protection
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Secure error responses

### Performance Optimizations
- **Backend Inference**: Dedicated ML processing server
- **Caching**: API response caching strategies
- **Image Optimization**: Automatic image compression
- **Lazy Loading**: Component and data lazy loading

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Commit** your changes
4. **Push** to the branch
5. **Create** a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- **Issues**: Create GitHub issues for bugs and feature requests
- **Documentation**: Check inline code comments and API documentation
- **Community**: Join our agricultural technology community

---

**PredictAgri** - Empowering farmers with AI-driven agricultural insights 🌾
