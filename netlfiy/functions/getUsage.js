// getUsage.js - Returns user's daily usage count for rate limit display

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get auth token from header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Verify user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Get today's usage count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: usageData, error: usageError } = await supabase
      .from('hook_analyses')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    if (usageError) {
      console.error('Usage query error:', usageError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch usage data' })
      };
    }

    // Return count
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        count: usageData.length,
        limit: 5
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};