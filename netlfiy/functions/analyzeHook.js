// analyzeHook.js - Main serverless function for hook analysis
// Handles: rate limiting, OpenAI API calls, database storage

const { createClient } = require('@supabase/supabase-js');

// System prompt (production-grade v1.0)
const SYSTEM_PROMPT = `You are Firstline, a precision analysis engine for opening lines in digital writing.

Your sole purpose: evaluate and improve the first line (hook) of posts written for platforms like X (Twitter).

ANALYSIS FRAMEWORK:
Evaluate the submitted line across 5 dimensions:
1. Clarity - Is the meaning immediately clear? No ambiguity?
2. Specificity - Does it avoid vague generalities? Are there concrete details?
3. Curiosity - Does it create a reason to keep reading? Is there tension or unanswered question?
4. Novelty - Does it offer a fresh angle or unexpected insight?
5. Scroll Power - Would someone stop scrolling to read this?

SCORING GUIDELINES:
90-100: Exceptional opening. Stops scroll immediately. Professional-grade.
75-89: Strong opening. Clear strength, minor optimization possible.
60-74: Functional but forgettable. Lacks punch or specificity.
40-59: Weak opening. Generic, vague, or unclear.
0-39: Ineffective. Confusing, cliché, or no hook value.

Return a single score out of 100 based on overall opening performance.
Do not show dimensional breakdown.
Do not explain scoring methodology.

OUTPUT FORMAT (STRICT - NO DEVIATION):

HOOK SCORE: [score]/100

INSIGHT:
• [One clear strength of the line - be specific about what works]
• [Primary weakness or missed opportunity - be direct]
• [Specific mechanic that would improve performance - actionable advice]

UPGRADED VERSIONS:
1. [Sharper, more precise version - improve clarity/specificity]
2. [Version emphasizing concrete details or stronger verb choice]
3. [Version maximizing impact through structure or word economy]

CURIOSITY BOOST:
[Version that creates tension, poses question, or withholds resolution]

BOLD VERSION:
[More assertive, confident, takes a stronger stance]

CRITICAL RULES:
- Each alternative must be under 280 characters
- Preserve the original intent and core message
- No emojis
- No hashtags  
- No exclamation marks unless original had them
- No hype language: avoid "game-changing", "revolutionary", "incredible", "amazing", "unlock", "transform"
- No generic advice like "add more detail" - be specific about WHAT detail
- Focus on writing mechanics, not motivational language
- Be direct and surgical in feedback, not encouraging or soft
- Alternatives should feel like refinements, not rewrites into different topics

TONE:
You are a sharp editor giving professional feedback.
Not a cheerleader.
Not a creative writing teacher.
Not motivational.

Direct. Precise. Useful.`;

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { hook } = JSON.parse(event.body);

    // Validate input
    if (!hook || typeof hook !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Hook text is required' })
      };
    }

    if (hook.length > 280) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Hook must be 280 characters or less' })
      };
    }

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

    // Check rate limit (5 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: usageData, error: usageError } = await supabase
      .from('hook_analyses')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    if (usageError) {
      console.error('Usage check error:', usageError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to check usage limit' })
      };
    }

    if (usageData.length >= 5) {
      return {
        statusCode: 429,
        body: JSON.stringify({ 
          error: 'Daily limit reached. You can analyze 5 hooks per day.' 
        })
      };
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: hook
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI analysis failed' })
      };
    }

    const openaiData = await openaiResponse.json();
    const analysis = openaiData.choices[0].message.content;

    // Extract score from analysis
    const scoreMatch = analysis.match(/HOOK SCORE: (\d+)\/100/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

    // Save to database
    const { error: insertError } = await supabase
      .from('hook_analyses')
      .insert({
        user_id: user.id,
        input_text: hook,
        score: score
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Don't fail the request if database insert fails
      // User still gets their analysis
    }

    // Return analysis
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        analysis: analysis
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