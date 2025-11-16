import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    const { scheduled } = await req.json().catch(() => ({ scheduled: false }));

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;

    // If not a scheduled job, authenticate the user
    if (!scheduled) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user from token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

      if (authError || !user) {
        console.error('Authentication error:', authError);
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = user.id;
      console.log(`Cleaning up sessions for user: ${userId}`);
    } else {
      console.log('Running scheduled cleanup for all users');
    }

    // Calculate timestamp for 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Build query
    let query = supabaseClient
      .from('roleplay_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('status', 'active')
      .eq('method', 'voice')
      .lt('started_at', twoHoursAgo);

    // If specific user, filter by user_id
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: updatedSessions, error: updateError } = await query.select();

    if (updateError) {
      console.error('Error updating sessions:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to cleanup sessions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanedCount = updatedSessions?.length || 0;
    console.log(`Successfully cleaned ${cleanedCount} sessions`);

    return new Response(
      JSON.stringify({ 
        success: true,
        cleaned: cleanedCount,
        message: cleanedCount > 0 
          ? `${cleanedCount} sessão(ões) órfã(s) finalizada(s)` 
          : 'Nenhuma sessão órfã encontrada'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
