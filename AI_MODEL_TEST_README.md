# 🤖 AI Model Endpoint Tester

A dedicated page for testing and monitoring AI model endpoint calls with real-time output display.

## 🎯 Features

### **Endpoint Testing**
- Test multiple AI endpoints: Predictions, Pipeline, NASA, Weather, Satellite
- Support for both GET and POST requests
- Automatic sample data generation for each endpoint
- Real-time request/response monitoring

### **Request Management**
- JSON request data editor with syntax highlighting
- Sample data generation based on selected endpoint
- Dynamic location-based data (uses current user location)
- Request validation and error handling

### **Response Monitoring**
- Real-time status tracking (calling, success, error)
- Response time measurement
- HTTP status code display
- Full request/response data inspection
- Expandable JSON viewer

### **Call History**
- Complete call history with timestamps
- Individual call removal
- Bulk clear functionality
- Call statistics dashboard

## 🚀 Available Endpoints

| Endpoint | Method | Description | Sample Data |
|----------|--------|-------------|-------------|
| `/api/predictions` | POST | Crop yield predictions | User location, weather, soil data |
| `/api/pipeline` | POST | Enhanced pipeline analysis | Farmer data with coordinates |
| `/api/agri/nasa` | GET | NASA satellite data | Latitude/longitude coordinates |
| `/api/weather` | GET | Weather information | Location coordinates |
| `/api/satellite` | GET | Satellite imagery | Region and coordinates |

## 📊 Statistics Dashboard

- **Total Calls**: Count of all API calls made
- **Successful**: Number of successful responses
- **Failed**: Number of failed requests
- **In Progress**: Currently executing calls

## 🎨 UI Features

### **Status Indicators**
- ✅ **Success**: Green badge with checkmark
- ❌ **Error**: Red badge with X mark
- ⏳ **Calling**: Yellow badge with loading indicator

### **Data Display**
- **Request Details**: Method, endpoint, response time, HTTP status
- **Request Data**: Expandable JSON viewer for sent data
- **Response Data**: Expandable JSON viewer for received data
- **Error Details**: Clear error messages for failed calls

## 🔧 Usage

1. **Select Endpoint**: Choose from available AI endpoints
2. **Review Sample Data**: Automatically generated sample data for the endpoint
3. **Modify Request**: Edit JSON data as needed
4. **Send Call**: Click "Send AI Call" button
5. **Monitor Results**: Watch real-time status updates
6. **Inspect Data**: Expand request/response sections to view full data

## 📍 Location Integration

- Automatically detects user location
- Uses location data in sample requests
- Falls back to test coordinates if location unavailable
- Displays current location in header

## 🛠️ Technical Details

### **State Management**
- React hooks for state management
- Real-time updates without page refresh
- Persistent call history during session

### **Error Handling**
- JSON validation for request data
- Network error handling
- HTTP status code monitoring
- User-friendly error messages

### **Performance**
- Response time tracking
- Efficient state updates
- Optimized rendering for large responses

## 🎯 Use Cases

1. **Development Testing**: Test new AI endpoints during development
2. **Debugging**: Monitor request/response flow for troubleshooting
3. **Performance Testing**: Measure response times across endpoints
4. **Data Validation**: Verify AI model inputs and outputs
5. **API Documentation**: Interactive testing of available endpoints

## 🔗 Navigation

Access the AI Model Test page via:
- Navigation menu: "AI Model Test" (🧪 icon)
- Direct URL: `/ai-model-test`

## 📝 Notes

- All calls are logged to browser console for debugging
- Call history persists during the session
- Sample data includes realistic agricultural parameters
- Location data is used when available for more accurate testing
