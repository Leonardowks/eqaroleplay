import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { email, role, organization_id, personal_message } = body;

    if (!email || !organization_id) {
      return new Response(
        JSON.stringify({ error: "email and organization_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate role
    const validRoles = ["member", "admin"];
    const inviteRole = validRoles.includes(role) ? role : "member";

    // Check if invitation already exists and is pending
    const { data: existing } = await supabaseAdmin
      .from("invitations")
      .select("id, accepted_at, expires_at")
      .eq("email", email)
      .eq("organization_id", organization_id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: "Já existe um convite pendente para este e-mail.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create invitation
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from("invitations")
      .insert({
        organization_id,
        email: email.trim().toLowerCase(),
        role: inviteRole,
        personal_message: personal_message || null,
        invited_by: userId,
      })
      .select("id, token")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build invite link
    const siteUrl =
      Deno.env.get("SITE_URL") ||
      req.headers.get("origin") ||
      "https://eqaroleplay.lovable.app";
    const inviteLink = `${siteUrl}/join/${invitation.token}`;

    return new Response(
      JSON.stringify({
        success: true,
        invite_link: inviteLink,
        invitation_id: invitation.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
