require('dotenv').config();

async function callOpenRouter(prompt, systemPrompt = 'You are an expert real estate appraiser and property valuation AI assistant.') {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Property Valuation Agent'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'OpenRouter API error');
    }

    return data.choices?.[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('OpenRouter API error:', error.message);
    throw error;
  }
}

module.exports = { callOpenRouter };
