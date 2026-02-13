exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { hook } = JSON.parse(event.body);
    
    if (!hook) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Hook required' })
      };
    }
    
    // Mock response for testing
    const mockAnalysis = `HOOK SCORE: 75/100

INSIGHT:
• Testing function deployment
• This is a placeholder response
• Real OpenAI integration will be added once functions deploy

UPGRADED VERSIONS:
1. Upgraded version one
2. Upgraded version two
3. Upgraded version three

CURIOSITY BOOST:
Curiosity-focused version here

BOLD VERSION:
Bold assertive version here`;
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis: mockAnalysis })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};