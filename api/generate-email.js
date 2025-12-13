/**
 * Vercel Serverless Function for OpenAI Email Generation
 * This function runs on the server only and never exposes the API key to the client
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { client, priority, adviserContext } = req.body;

    // Validate required data
    if (!client || !priority) {
      return res.status(400).json({ error: 'Missing required client or priority data' });
    }

    // Get OpenAI API key from environment (server-side only)
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OPENAI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Build the prompt for email generation
    const prompt = buildEmailPrompt(client, priority, adviserContext);

    // Call OpenAI API using fetch (no client-side SDK required)
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using the cheapest available model
        messages: [
          {
            role: 'system',
            content: 'You are a professional financial adviser assistant. Generate personalized, professional outreach emails to clients. Keep emails concise, warm, and action-oriented. Do not use emojis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openAiResponse.ok) {
      const errorData = await openAiResponse.json();
      console.error('OpenAI API error:', errorData);
      return res.status(openAiResponse.status).json({ 
        error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}` 
      });
    }

    const data = await openAiResponse.json();
    const generatedEmail = data.choices[0]?.message?.content || '';

    // Return only the generated email text
    return res.status(200).json({ email: generatedEmail.trim() });

  } catch (error) {
    console.error('Error in generate-email function:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Build a comprehensive prompt for email generation
 */
function buildEmailPrompt(client, priority, adviserContext) {
  const aua = parseFloat(client.total_aua) || 0;
  const fees = parseFloat(client.total_fees) || 0;
  const logins = parseInt(client.logins_last_12_months) || 0;
  const meetings = parseInt(client.meetings_last_12_months) || 0;
  const accounts = parseInt(client.number_of_accounts) || 0;

  let prompt = `Generate a personalized outreach email for the following client:\n\n`;
  prompt += `Client Name: ${client.name}\n`;
  prompt += `Priority Tier: ${priority.tier} (Score: ${priority.score}/100)\n`;
  prompt += `Assets Under Advice: £${aua.toLocaleString()}\n`;
  prompt += `Annual Fees: £${fees.toLocaleString()}\n`;
  prompt += `Engagement (Last 12 months): ${logins} portal logins, ${meetings} meetings\n`;
  prompt += `Number of Accounts: ${accounts}\n\n`;

  if (adviserContext && adviserContext.trim()) {
    prompt += `Adviser Context: ${adviserContext}\n\n`;
  }

  prompt += `Generate a professional email that:\n`;
  prompt += `- Addresses the client by name\n`;
  prompt += `- Acknowledges their relationship with us\n`;
  
  if (priority.tier === 'High') {
    prompt += `- Emphasizes their importance as a valued client\n`;
    prompt += `- Offers proactive service or exclusive insights\n`;
  } else if (priority.tier === 'Medium') {
    prompt += `- Maintains engagement and shows care\n`;
    prompt += `- Suggests a check-in or review\n`;
  } else {
    prompt += `- Re-engages them warmly\n`;
    prompt += `- Invites them to reconnect\n`;
  }

  if (logins === 0 || meetings === 0) {
    prompt += `- Gently encourages more engagement without being pushy\n`;
  }

  prompt += `- Includes a clear call-to-action\n`;
  prompt += `- Uses a warm, professional tone\n`;
  prompt += `- Keep it under 200 words\n`;
  prompt += `- Do NOT use any emojis\n`;
  prompt += `- Sign off with "Best regards" (no specific name)\n`;

  return prompt;
}
