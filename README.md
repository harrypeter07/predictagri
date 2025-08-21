# PredictAgri

Agriculture Crop Yield Prediction System built with Next.js 19 and Supabase.

## Features

- 🌾 Crop yield prediction using machine learning
- 📊 Real-time data visualization
- 🗺️ Multi-region support
- 🔔 Risk assessment and alerts
- 📱 Modern responsive UI

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to your project's SQL Editor
3. Copy and paste the contents of `supabase-migration.sql` into the editor
4. Run the migration to create all tables and sample data

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

You can find these values in your Supabase project settings under "API".

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Database Schema

The system uses the following tables:

- **regions**: Geographic regions with soil data
- **crops**: Available crop types and seasons
- **predictions**: Crop yield predictions with features
- **alerts**: Risk alerts and notifications

## API Endpoints

- `POST /api/predictions`: Generate new crop yield prediction
- `GET /api/predictions`: Retrieve recent predictions

## Tech Stack

- **Frontend**: Next.js 19 (App Router), React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Database**: PostgreSQL with JSONB support
- **Deployment**: Vercel-ready

## Next Steps

- [ ] Integrate ONNX model for real predictions
- [ ] Add user authentication
- [ ] Implement real-time alerts
- [ ] Add data visualization charts
- [ ] Mobile app development