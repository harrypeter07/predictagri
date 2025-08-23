#!/usr/bin/env node

/**
 * API Status Checker for PredictAgri
 * This script checks the status of all configured APIs and services
 */

import dotenv from 'dotenv';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🔍 PredictAgri API Status Checker\n');

// Check required environment variables
const requiredVars = {
  'Supabase URL': 'NEXT_PUBLIC_SUPABASE_URL',
  'Supabase Anon Key': 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'Google Earth Engine Private Key': 'GOOGLE_EARTH_ENGINE_PRIVATE_KEY',
  'Google Earth Engine Client Email': 'GOOGLE_EARTH_ENGINE_CLIENT_EMAIL',
  'OpenWeather API Key': 'OPENWEATHER_API_KEY',
  'NASA API Key': 'NASA_API_KEY',
  'Twilio Account SID': 'TWILIO_ACCOUNT_SID',
  'Twilio Auth Token': 'TWILIO_AUTH_TOKEN',
  'Twilio Phone Number': 'TWILIO_PHONE_NUMBER',
  'Timezone API Key': 'TIMEZONE_API_KEY',
  'Backend URL': 'BACKEND_URL'
};

let missingCount = 0;
let configuredCount = 0;

console.log('📋 Environment Variables Status:\n');

for (const [name, key] of Object.entries(requiredVars)) {
  const value = process.env[key];
  if (value && value !== 'your_' + key.toLowerCase().replace(/[^a-z0-9]/g, '_')) {
    console.log(`✅ ${name}: Configured`);
    configuredCount++;
  } else {
    console.log(`❌ ${name}: Missing or not configured`);
    missingCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Configured: ${configuredCount}/${Object.keys(requiredVars).length}`);
console.log(`   Missing: ${missingCount}`);

if (missingCount > 0) {
  console.log(`\n⚠️  To fix missing configurations:`);
  console.log(`   1. Copy env.example to .env.local`);
  console.log(`   2. Fill in the missing API keys`);
  console.log(`   3. Restart your development server`);
}

// Check specific service statuses
console.log(`\n🔧 Service Status:`);

// Check if we can access environment
if (process.env.NODE_ENV === 'development') {
  console.log(`✅ Development Environment: Active`);
} else {
  console.log(`ℹ️  Environment: ${process.env.NODE_ENV || 'Not set'}`);
}

// Check if we're in the right directory
try {
  const fs = await import('fs');
  if (fs.existsSync('package.json')) {
    console.log(`✅ Project Root: Found package.json`);
  } else {
    console.log(`❌ Project Root: No package.json found`);
  }
} catch (error) {
  console.log(`⚠️  Project Root: Could not verify`);
}

console.log(`\n🎯 Next Steps:`);
if (missingCount === 0) {
  console.log(`   All APIs are configured! Your app should work properly.`);
} else {
  console.log(`   1. Configure missing API keys in .env.local`);
  console.log(`   2. For Twilio daily limits: Upgrade account or wait for reset`);
  console.log(`   3. For timezone data: Get API key from timezonedb.com`);
}

console.log(`\n✨ Happy coding!`);
