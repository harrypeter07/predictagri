# PredictAgri 🌱

Agriculture Crop Yield Prediction System built with Next.js 19 and Supabase.

## ✨ Features

- 🌾 **Crop Yield Prediction** - Advanced ML-based predictions with mock data
- 📊 **Real-time Dashboard** - Live statistics and monitoring
- 🗺️ **Multi-region Support** - Manage agricultural regions with soil data
- 🔔 **Risk Assessment** - Comprehensive risk scoring and alerts
- 📱 **Modern Responsive UI** - Beautiful interface with Tailwind CSS
- 🚀 **Mock Data System** - Comprehensive testing with realistic data
- 📈 **Analytics Dashboard** - Detailed insights and statistics

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase Database

#### Step 2.1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be set up (usually takes 1-2 minutes)

#### Step 2.2: Run Database Migration
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-migration.sql`
3. Paste it into the SQL Editor and click **Run**
4. This will create all tables and insert sample data

#### Step 2.3: Get API Credentials
1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the **Project URL** and **anon public** key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
predictagri/
├── app/
│   ├── components/
│   │   └── Navigation.js          # Main navigation component
│   ├── api/
│   │   ├── predictions/route.js   # Predictions API
│   │   ├── regions/route.js       # Regions API
│   │   └── crops/route.js         # Crops API
│   ├── regions/page.js            # Regions management page
│   ├── crops/page.js              # Crops management page
│   ├── predictions/page.js        # Predictions management page
│   ├── page.js                    # Dashboard (home page)
│   └── layout.js                  # Root layout
├── lib/
│   ├── supabaseClient.js          # Supabase client configuration
│   └── mockData.js                # Mock data utilities
├── supabase-migration.sql         # Database schema and sample data
└── env.example                    # Environment variables template
```

## 🗄️ Database Schema

### Tables

1. **regions** - Geographic regions with soil data
   - `id` (UUID, Primary Key)
   - `name` (Text)
   - `lat`, `lon` (Coordinates)
   - `soil_n`, `soil_p`, `soil_k` (NPK values)
   - `ph` (Soil pH)
   - `created_at` (Timestamp)

2. **crops** - Available crop types
   - `id` (UUID, Primary Key)
   - `name` (Text)
   - `season` (Text: Rabi/Kharif/Year-round)

3. **predictions** - Crop yield predictions
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key to auth.users)
   - `crop_id` (UUID, Foreign Key to crops)
   - `region_id` (UUID, Foreign Key to regions)
   - `features` (JSONB - input features)
   - `yield` (Numeric - predicted yield)
   - `risk_score` (Numeric - risk probability)
   - `created_at` (Timestamp)

4. **alerts** - Risk alerts and notifications
   - `id` (UUID, Primary Key)
   - `prediction_id` (UUID, Foreign Key to predictions)
   - `type` (Text - alert type)
   - `message` (Text - alert message)
   - `sent_at` (Timestamp)

## 🔌 API Endpoints

### Predictions
- `GET /api/predictions` - Get recent predictions
- `POST /api/predictions` - Create new prediction

### Regions
- `GET /api/regions` - Get all regions
- `POST /api/regions` - Create new region

### Crops
- `GET /api/crops` - Get all crops
- `POST /api/crops` - Create new crop

## 🎯 Usage Guide

### 1. Initial Setup
1. Visit the dashboard at `/`
2. Click "Add Regions" to populate with sample regions
3. Click "Add Crops" to populate with sample crops

### 2. Generate Predictions
1. Go to `/predictions` page
2. Select crop and region from dropdowns
3. Click "Generate Prediction" for single prediction
4. Click "Generate 5 Random Predictions" for bulk testing

### 3. View Data
- **Dashboard** (`/`) - Overview and quick actions
- **Regions** (`/regions`) - Manage agricultural regions
- **Crops** (`/crops`) - Manage crop types and seasons
- **Predictions** (`/predictions`) - View and generate predictions

## 🛠️ Tech Stack

- **Frontend**: Next.js 19 (App Router), React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Database**: PostgreSQL with JSONB support
- **Styling**: Tailwind CSS with responsive design
- **Deployment**: Vercel-ready

## 🧪 Testing Features

### Mock Data System
- **8 Sample Regions** with realistic soil data
- **12 Sample Crops** with proper seasons
- **Realistic Predictions** with feature-based yield calculation
- **Risk Assessment** based on environmental factors
- **Bulk Generation** for testing multiple scenarios

### Testing Scenarios
1. **Single Prediction** - Test individual crop-region combinations
2. **Bulk Predictions** - Generate multiple random predictions
3. **Data Management** - Add/edit regions and crops
4. **Error Handling** - Test with invalid data
5. **Real-time Updates** - See changes immediately

## 🔧 Development

### Adding New Features
1. Create new API routes in `app/api/`
2. Add new pages in `app/`
3. Update navigation in `app/components/Navigation.js`
4. Add mock data in `lib/mockData.js`

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

## 🚀 Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Environment Variables for Production
Make sure to set the same environment variables in your production environment.

## 📈 Next Steps

- [ ] **ONNX Model Integration** - Replace mock predictions with real ML model
- [ ] **User Authentication** - Add Supabase Auth for user management
- [ ] **Real-time Alerts** - Implement WebSocket notifications
- [ ] **Data Visualization** - Add charts and graphs
- [ ] **Mobile App** - React Native companion app
- [ ] **Weather Integration** - Real-time weather data
- [ ] **Historical Analysis** - Trend analysis and forecasting
- [ ] **Export Features** - PDF/Excel report generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**🌱 Built with ❤️ for the future of agriculture**