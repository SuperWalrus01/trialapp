// Supabase Debug Utility
// Run this in the browser console to diagnose issues

export const debugSupabase = async () => {
  console.group('🔍 Supabase Debug Information');
  
  // Check environment variables
  console.group('1. Environment Variables');
  console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
  console.log('REACT_APP_SUPABASE_ANON_KEY present:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);
  console.log('REACT_APP_SUPABASE_ANON_KEY length:', process.env.REACT_APP_SUPABASE_ANON_KEY?.length);
  console.groupEnd();

  // Import and test Supabase client
  try {
    const { supabase } = await import('./supabaseClient');
    
    console.group('2. Supabase Client Test');
    console.log('Supabase client created:', !!supabase);
    console.log('Supabase URL:', supabase.supabaseUrl);
    console.log('Supabase Key present:', !!supabase.supabaseKey);
    console.groupEnd();

    // Test basic connection
    console.group('3. Connection Test');
    try {
      const { data, error } = await supabase.from('client').select('count', { count: 'exact', head: true });
      if (error) {
        console.error('❌ Connection failed:', error);
        console.log('Error details:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        });
      } else {
        console.log('✅ Connection successful');
        console.log('Table access confirmed');
      }
    } catch (err) {
      console.error('❌ Connection error:', err);
    }
    console.groupEnd();

    // Test authentication
    console.group('4. Authentication Test');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ Auth session error:', error);
      } else {
        console.log('Current session:', session ? '✅ Logged in' : '❌ Not logged in');
        if (session) {
          console.log('User:', session.user.email);
        }
      }
    } catch (err) {
      console.error('❌ Auth error:', err);
    }
    console.groupEnd();

    // Test table structure
    console.group('5. Table Structure Test');
    try {
      const { data, error } = await supabase
        .from('client')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ Table query failed:', error);
        
        // Provide specific troubleshooting
        if (error.code === 'PGRST116') {
          console.log('🔧 Solution: Table "client" does not exist. Create it in Supabase Dashboard.');
        } else if (error.code === '42501') {
          console.log('🔧 Solution: Permission denied. Enable Row Level Security and add policies.');
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log('🔧 Solution: Create the "client" table in your Supabase database.');
        }
      } else {
        console.log('✅ Table query successful');
        console.log('Sample data structure:', data?.[0] ? Object.keys(data[0]) : 'No data');
        console.log('Record count:', data?.length || 0);
      }
    } catch (err) {
      console.error('❌ Table query error:', err);
    }
    console.groupEnd();

    // Check RLS policies
    console.group('6. Row Level Security Check');
    try {
      const { data, error } = await supabase.rpc('check_table_permissions', {});
      if (error) {
        console.log('⚠️ Cannot check RLS policies programmatically');
        console.log('Manual check needed: Go to Supabase Dashboard → Authentication → Policies');
      }
    } catch (err) {
      console.log('⚠️ RLS check not available - this is normal');
    }
    console.groupEnd();

  } catch (importError) {
    console.error('❌ Failed to import Supabase client:', importError);
  }

  console.groupEnd();
  
  return {
    message: 'Debug complete. Check console for detailed information.',
    nextSteps: [
      'Check if all environment variables are set correctly',
      'Verify the "client" table exists in Supabase',
      'Ensure RLS policies allow your user to access the table',
      'Try creating a test user if authentication fails'
    ]
  };
};

// Auto-run debug if in development
if (process.env.NODE_ENV === 'development') {
  window.debugSupabase = debugSupabase;
  console.log('🛠️ Supabase debug utility available as window.debugSupabase()');
}