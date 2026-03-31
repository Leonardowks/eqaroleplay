import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { company_config } = await req.json();

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

    const prompt = `Você é um especialista em vendas B2B. Com base no perfil da empresa abaixo, gere EXATAMENTE 3 personas de clientes para treinamento de vendas em roleplay.

PERFIL DA EMPRESA:
- Nome: ${company_config.company_name}
- Segmento: ${company_config.segment}
- Produto/Serviço: ${company_config.product_description}
- Ticket Médio: ${company_config.ticket_range}
- Ciclo de Vendas: ${company_config.sales_cycle}
- Metodologia: ${company_config.methodology}

PERFIL DO CLIENTE IDEAL (ICP):
- Cargo do Comprador: ${company_config.icp?.buyer_role || 'Gerente'}
- Principais Dores: ${(company_config.icp?.main_pains || []).join(', ')}
- Objeções Comuns: ${(company_config.icp?.common_objections || []).join(', ')}
- Nível de Sofisticação: ${company_config.icp?.sophistication_level || 'intermediario'}

Gere 3 personas com dificuldades diferentes:
1. "easy" - Cliente receptivo, interessado, faz perguntas construtivas
2. "medium" - Cliente neutro, precisa ser convencido, faz objeções moderadas
3. "hard" - Cliente difícil, cético, faz objeções fortes, pressiona por desconto

Para cada persona, retorne:
- name: nome brasileiro realista
- role: cargo na empresa
- company: nome fictício de empresa brasileira do setor do ICP
- sector: setor da empresa do cliente
- difficulty: "easy", "medium" ou "hard"
- description: 2-3 frases descrevendo a personalidade e comportamento
- personality_traits: array com 3-5 traços de personalidade
- objection_patterns: array com 2-3 objeções que essa persona costuma fazer

Responda APENAS com JSON válido no formato:
{"personas": [...]}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você gera personas de clientes para treinamento de vendas. Responda APENAS com JSON válido.' },
          { role: 'user', content: prompt },
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

    return new Response(JSON.stringify(parsed), {
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
