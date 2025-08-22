# 🛰️ Google Earth Engine Setup Guide

This guide will help you set up Google Earth Engine integration for PredictAgri.

## 📋 Prerequisites

1. **Google Account** with access to Google Cloud Console
2. **Google Earth Engine Account** (Apply at [earthengine.google.com](https://earthengine.google.com))
3. **Google Cloud Project** with billing enabled
4. **Node.js** and **npm** installed

## 🚀 Step-by-Step Setup

### 1. Enable Google Earth Engine API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Library**
4. Search for "Earth Engine API" and enable it
5. Wait for the API to be enabled (may take a few minutes)

### 2. Create Service Account

1. In Google Cloud Console, go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Fill in the details:
   - **Name**: `predictagri-earthengine`
   - **Description**: `Service account for PredictAgri Earth Engine integration`
4. Click **Create and Continue**
5. For **Role**, select **Earth Engine Resource Viewer** (minimum required)
6. Click **Continue** and then **Done**

### 3. Generate Private Key

1. Click on your newly created service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Choose **JSON** format
5. Download the JSON file (keep it secure!)

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local`
2. Add your service account credentials:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
```

**Important**: The private key should include the `\n` characters for line breaks.

### 5. Request Earth Engine Access

1. Go to [earthengine.google.com](https://earthengine.google.com)
2. Sign in with your Google account
3. Click **Sign up for Earth Engine**
4. Fill out the application form:
   - **Purpose**: Research/Education
   - **Project description**: Agricultural prediction using satellite data
   - **Data usage**: NDVI, land surface temperature, soil moisture analysis
5. Submit and wait for approval (usually 24-48 hours)

### 6. Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to the predictions page
3. Check the browser console for initialization messages
4. Look for "Google Earth Engine initialized successfully"

## 🔧 Troubleshooting

### Common Issues

#### 1. "Failed to initialize Google Earth Engine"

**Cause**: Missing or incorrect credentials
**Solution**: 
- Verify environment variables are set correctly
- Check that the private key includes `\n` characters
- Ensure the service account has the correct role

#### 2. "API call limit exceeded"

**Cause**: Daily quota limit reached
**Solution**:
- Wait for the 24-hour reset
- Check your usage in Google Cloud Console
- Consider upgrading your plan

#### 3. "Authentication failed"

**Cause**: Service account permissions
**Solution**:
- Verify the service account has **Earth Engine Resource Viewer** role
- Check that the Earth Engine API is enabled
- Ensure the service account email is correct

#### 4. "Fallback mode active"

**Cause**: Service unavailable or too many errors
**Solution**:
- Check network connectivity
- Verify API quotas
- Reset error counter via `/api/satellite/status`

### Debug Mode

Enable detailed logging by adding to your `.env.local`:

```bash
DEBUG=google-earth-engine:*
```

## 📊 API Endpoints

### Get Satellite Data
```
GET /api/satellite?regionId={id}&dataType={type}
```

**Data Types**:
- `comprehensive` - All data types
- `ndvi` - Vegetation index
- `temperature` - Land surface temperature
- `soil-moisture` - Soil moisture content
- `vegetation-health` - Vegetation health index

### Get Service Status
```
GET /api/satellite/status
```

### Control Service
```
POST /api/satellite/status
{
  "action": "reset_errors" | "enable_fallback" | "disable_fallback"
}
```

## 🎯 Data Sources

### MODIS Satellite Data
- **NDVI**: MOD13Q1 (250m resolution, 16-day composite)
- **Temperature**: MOD11A1 (1km resolution, daily)
- **Coverage**: Global, updated regularly

### SMAP Soil Moisture
- **Resolution**: 9km
- **Coverage**: Global
- **Update**: Daily

### Vegetation Health Index
- **Calculation**: Combined NDVI and temperature
- **Range**: 0-1 (0 = poor, 1 = excellent)

## 💰 Cost Considerations

### Free Tier Limits
- **Daily API calls**: 1,000
- **Data processing**: Limited
- **Export**: Restricted

### Paid Plans
- **Standard**: $0.50 per 1,000 API calls
- **Premium**: Custom pricing for high-volume usage
- **Enterprise**: Contact sales for large deployments

## 🔒 Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for sensitive data
3. **Rotate service account keys** regularly
4. **Monitor API usage** to prevent abuse
5. **Implement rate limiting** in production

## 📈 Monitoring and Alerts

### Health Indicators
- 🟢 **Healthy**: Service operating normally
- 🟡 **Attention**: Some errors detected
- 🟠 **Warning**: Approaching API limits
- 🔴 **Critical**: Too many errors
- 🟣 **Degraded**: Using fallback mode

### Recommendations
The system provides automatic recommendations based on:
- API usage patterns
- Error frequency
- Service health status

## 🚀 Production Deployment

### Vercel
1. Add environment variables in Vercel dashboard
2. Ensure private key is properly formatted
3. Test with a small region first

### Docker
1. Use Docker secrets for credentials
2. Mount environment files securely
3. Implement health checks

### Kubernetes
1. Use Kubernetes secrets
2. Implement proper resource limits
3. Set up monitoring and alerting

## 📚 Additional Resources

- [Google Earth Engine Documentation](https://developers.google.com/earth-engine)
- [MODIS Data Products](https://modis.gsfc.nasa.gov/data/)
- [SMAP Mission](https://smap.jpl.nasa.gov/)
- [Google Cloud IAM](https://cloud.google.com/iam/docs)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Google Cloud Console logs
3. Check browser console for error messages
4. Verify environment variable format
5. Test with the status endpoint

## 🔄 Updates and Maintenance

- **Monthly**: Review API usage and costs
- **Quarterly**: Update service account keys
- **Annually**: Review and update permissions
- **As needed**: Monitor for new data products

---

**Note**: This integration automatically falls back to mock data when Google Earth Engine is unavailable, ensuring your application continues to function for demonstration purposes.
