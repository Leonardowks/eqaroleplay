const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { company_config, organization_id } = await req.json();

    if (!company_config) {
      return new Response(JSON.stringify({ error: 'company_config is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mainPains = (company_config.icp?.main_pains || []).join(', ');
    const commonObjections = (company_config.icp?.common_objections || []).join(', ');
    const salesStages = (company_config.sales_stages || []).join(', ');

    const userPrompt = `Company: ${company_config.company_name} | Segment: ${company_config.segment} | Product: ${company_config.product_description}
ICP: Buyer is ${company_config.icp?.buyer_role || 'Gerente'}. Main pains: ${mainPains}. Common objections: ${commonObjections}. Sophistication: ${company_config.icp?.sophistication_level || 'intermediario'}.
Methodology: ${company_config.methodology}. Sales stages: ${salesStages}.

Generate exactly 3 personas:
- Persona 1: difficulty = 'easy' (cooperative, open, few objections)
- Persona 2: difficulty = 'medium' (has real objections, needs convincing)
- Persona 3: difficulty = 'hard' (skeptical, time-pressured, multiple objections)

Return JSON array:
[{
  "name": string (Brazilian first name + last name),
  "role": string (job title matching buyer_role),
  "company": string (fictional company name matching segment),
  "sector": string,
  "difficulty": "easy"|"medium"|"hard",
  "description": string (2-3 sentences about personality and behavior in Portuguese),
  "pain_points": string[] (3 items from company context, in Portuguese),
  "objection_patterns": string[] (3 realistic objections for this persona, in Portuguese),
  "buying_signals": string[] (3 signals this persona shows when interested, in Portuguese),
  "resistance_level": number (1-10, easy=2-3, medium=5-6, hard=8-9)
}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in B2B sales training. Generate 3 realistic buyer personas for roleplay training based on the company context provided. Return ONLY a valid JSON object with a "personas" key containing the array, no markdown.',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const parsed = JSON.parse(content);

    // Normalize: accept both {personas: [...]} and direct array
    const personas = Array.isArray(parsed) ? parsed : (parsed.personas || []);

    return new Response(JSON.stringify({ personas, organization_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error generating personas:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
