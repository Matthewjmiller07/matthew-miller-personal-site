// Run this script to test Supabase connection
// Usage: node scripts/test-supabase.js

const { createClient } = require('@supabase/supabase-js');

// These should match what you'll put in your .env file
const supabaseUrl = 'https://qukziojymwlvmrzapgyo.supabase.co';
const supabaseKey = 'sb_publishable__aLEcTprJpumgIBhcwE_BA_XVMDW9vQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test connection by fetching the first row
    const { data, error } = await supabase
      .from('Serendipitous Names')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error connecting to Supabase:');
      console.error(error);
      return;
    }

    console.log('✅ Successfully connected to Supabase!');
    console.log('First row data:', data);
  } catch (err) {
    console.error('Unexpected error:');
    console.error(err);
  }
}

testConnection();
