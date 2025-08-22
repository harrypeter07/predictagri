# 🛰️ Satellite Data Dashboard Setup Guide

## Overview
The Satellite Data Dashboard provides real-time satellite imagery and vegetation analysis from Google Earth Engine, including:
- **NDVI (Normalized Difference Vegetation Index)** - Vegetation health monitoring
- **True Color RGB Images** - High-resolution satellite imagery
- **Land Surface Temperature** - Thermal analysis
- **Soil Data** - Moisture, composition, and texture analysis
- **Land Use Classification** - Land cover mapping

## 🚀 Quick Start

### 1. Required API Keys

#### Google Earth Engine (Required for Satellite Images)
1. Go to [Google Earth Engine](https://developers.google.com/earth-engine/guides/service_account)
2. Create a service account
3. Download the JSON credentials file
4. Add to your `.env.local`:

```bash
GOOGLE_EARTH_ENGINE_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_EARTH_ENGINE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
```

#### NASA API (Required for Agricultural Insights)
1. Go to [NASA API Portal](https://api.nasa.gov/)
2. Generate an API key
3. Add to your `.env.local`:

```bash
NASA_API_KEY=your_nasa_api_key_here
```

#### Weather APIs (Required for Weather Data)
1. Go to [OpenWeather](https://openweathermap.org/api)
2. Generate an API key
3. Add to your `.env.local`:

```bash
OPENWEATHER_API_KEY=your_openweather_api_key_here
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key_here
```

### 2. Environment File Setup

Create a `.env.local` file in your project root with all required keys:

```bash
# Google Earth Engine
GOOGLE_EARTH_ENGINE_CLIENT_EMAIL=your_email@project.iam.gserviceaccount.com
GOOGLE_EARTH_ENGINE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"

# NASA API
NASA_API_KEY=your_nasa_api_key_here

# OpenWeather
OPENWEATHER_API_KEY=your_openweather_api_key_here
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key_here

# OpenCage (Geocoding)
OPENCAGE_API_KEY=your_opencage_api_key_here

# TimezoneDB
TIMEZONE_API_KEY=your_timezone_api_key_here

# Twilio (SMS Alerts)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
```

### 3. Install Dependencies

```bash
npm install @google/earthengine
```

## 🌍 How It Works

### Satellite Data Flow
1. **User Request** → Frontend requests satellite data for a region
2. **GEE Service** → Google Earth Engine fetches real satellite imagery
3. **Image Processing** → Generates NDVI, RGB, and thermal images
4. **Data Analysis** → Calculates vegetation health, soil quality, etc.
5. **Frontend Display** → Shows images with metadata and analysis

### Data Sources
- **Sentinel-2**: 10m resolution true color images
- **MODIS**: 250m-1km resolution NDVI and temperature
- **SMAP**: Soil moisture data
- **ESA WorldCover**: Land use classification
- **SoilGrids250m**: Soil properties

## 🎯 Features

### Real-Time Satellite Images
- **NDVI Visualization**: Red (low) to green (high) vegetation density
- **True Color RGB**: Natural color satellite imagery
- **Thermal Imaging**: Land surface temperature mapping
- **High Resolution**: Up to 10m resolution for detailed analysis

### Agricultural Analysis
- **Vegetation Health**: NDVI-based crop monitoring
- **Soil Assessment**: Moisture, pH, organic content analysis
- **Land Use Mapping**: Crop vs. forest vs. urban classification
- **Climate Impact**: Temperature and moisture trend analysis

### Interactive Dashboard
- **Image Gallery**: Filter by image type (NDVI, RGB, Temperature)
- **Metadata Display**: Satellite info, resolution, cloud cover
- **Coordinate System**: Precise location tracking
- **Full-Size View**: Click to view high-resolution images

## 🔧 Technical Implementation

### Backend Services
- `GoogleEarthEngineService`: Handles satellite data fetching
- `NASADataService`: Provides agricultural insights
- `WeatherService`: Real-time weather data
- `ImageProcessingService`: Image analysis and enhancement

### Frontend Components
- `SatelliteDataDashboard`: Main satellite display component
- `Image Gallery`: Interactive image viewer
- `NDVI Card`: Vegetation health indicators
- `Metadata Panel`: Technical image information

### API Endpoints
- `/api/pipeline`: Main satellite data endpoint
- `/api/agri/nasa`: NASA agricultural data
- `/api/weather`: Weather information
- `/api/satellite/*`: Satellite-specific endpoints

## 🚨 Troubleshooting

### Common Issues

#### "Fallback Mode Active"
- **Cause**: Missing or invalid GEE credentials
- **Solution**: Check your `.env.local` file and API keys

#### "No Satellite Images Available"
- **Cause**: API rate limits or service issues
- **Solution**: Wait for rate limit reset or check service status

#### "Image Loading Failed"
- **Cause**: Network issues or invalid image URLs
- **Solution**: Check internet connection and API responses

### Debug Mode
Enable debug logging by setting in your environment:
```bash
DEBUG_GEE=true
```

## 📊 Data Quality

### Image Resolution
- **High Quality**: 10m resolution (Sentinel-2)
- **Medium Quality**: 250m resolution (MODIS)
- **Low Quality**: 1km+ resolution (fallback data)

### Update Frequency
- **NDVI Data**: Every 16 days (MODIS)
- **RGB Images**: Every 5 days (Sentinel-2)
- **Weather Data**: Every hour
- **Soil Data**: Static (monthly updates)

## 🔮 Future Enhancements

### Planned Features
- **Historical Analysis**: Time-series satellite data
- **Machine Learning**: AI-powered crop disease detection
- **Mobile App**: Native mobile satellite viewer
- **Real-Time Alerts**: Automated crop health notifications

### API Improvements
- **WebSocket Support**: Real-time data streaming
- **Batch Processing**: Multiple region analysis
- **Custom Algorithms**: User-defined analysis methods
- **Export Options**: Download images and data

## 📚 Additional Resources

- [Google Earth Engine Documentation](https://developers.google.com/earth-engine)
- [NASA API Documentation](https://api.nasa.gov/)
- [Sentinel-2 Mission](https://sentinel.esa.int/web/sentinel/missions/sentinel-2)
- [MODIS Data](https://modis.gsfc.nasa.gov/)

## 🆘 Support

If you encounter issues:
1. Check the console for error messages
2. Verify all API keys are correctly set
3. Ensure dependencies are installed
4. Check network connectivity
5. Review the troubleshooting section above

---

**Note**: This system requires valid API keys to function. Without proper credentials, it will fall back to simulated data for demonstration purposes.
