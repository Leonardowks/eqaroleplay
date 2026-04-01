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
    const body = await req.json();
    const { token, full_name, password } = body;

    if (!token || !full_name?.trim() || !password) {
      return new Response(
        JSON.stringify({ error: "token, full_name e password são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (full_name.trim().length > 100) {
      return new Response(
        JSON.stringify({ error: "Nome deve ter no máximo 100 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch invitation by token
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (invError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Convite não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invitation.accepted_at) {
      return new Response(
        JSON.stringify({ error: "Este convite já foi aceito." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Este convite expirou." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create auth user (admin API — no email confirmation needed for flow)
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (signUpError) {
      if (signUpError.message.includes("already been registered") || signUpError.message.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "E-mail já cadastrado. Faça login com sua conta existente." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("SignUp error:", signUpError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar conta: " + signUpError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = authData.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Erro inesperado ao criar conta." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create profile (service role bypasses RLS)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: full_name.trim(),
        organization_id: invitation.organization_id,
      });

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // 4. Create organization member
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError) {
      console.error("Member error:", memberError);
    }

    // 5. If role is admin, add user_role
    if (invitation.role === "admin") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "admin",
          organization_id: invitation.organization_id,
        });

      if (roleError) {
        console.error("Role error:", roleError);
      }
    }

    // 6. Mark invitation as accepted
    const { error: acceptError } = await supabaseAdmin
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (acceptError) {
      console.error("Accept error:", acceptError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conta criada com sucesso!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
