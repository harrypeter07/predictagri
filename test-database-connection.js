// Test database connection and table structure
import { createClient } from '@supabase/supabase-js'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Testing Supabase connection...')
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('\n🔍 Testing database connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('predictions')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error)
      return
    }
    
    console.log('✅ Database connection successful')
    
    // Check table structure
    console.log('\n🔍 Checking table structure...')
    
    // Test predictions table
    const { data: predictionsTest, error: predictionsError } = await supabase
      .from('predictions')
      .select('*')
      .limit(1)
    
    if (predictionsError) {
      console.error('❌ Predictions table error:', predictionsError)
    } else {
      console.log('✅ Predictions table accessible')
    }
    
    // Test crops table
    const { data: cropsTest, error: cropsError } = await supabase
      .from('crops')
      .select('*')
      .limit(1)
    
    if (cropsError) {
      console.error('❌ Crops table error:', cropsError)
    } else {
      console.log('✅ Crops table accessible')
    }
    
    // Test regions table
    const { data: regionsTest, error: regionsError } = await supabase
      .from('regions')
      .select('*')
      .limit(1)
    
    if (regionsError) {
      console.error('❌ Regions table error:', regionsError)
    } else {
      console.log('✅ Regions table accessible')
    }
    
    // Test inserting a simple record
    console.log('\n🔍 Testing insert operation...')
    
    const testRecord = {
      user_id: 'test-user',
      crop_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      region_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      yield: 0.5,
      risk_score: 25,
      features: { test: true }
    }
    
    const { data: insertTest, error: insertError } = await supabase
      .from('predictions')
      .insert([testRecord])
      .select()
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError)
      console.error('Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
    } else {
      console.log('✅ Insert test successful')
      
      // Clean up test record
      if (insertTest && insertTest[0]) {
        await supabase
          .from('predictions')
          .delete()
          .eq('id', insertTest[0].id)
        console.log('✅ Test record cleaned up')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error)
  }
}

testConnection()
