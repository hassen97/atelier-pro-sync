import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, phone } = await req.json().catch(() => ({}));

    if (!username && !phone) {
      return new Response(
        JSON.stringify({ error: "username or phone required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let exists = false;

    if (username) {
      const trimmed = username.trim().toLowerCase();
      if (trimmed.length < 3 || trimmed.length > 20) {
        return new Response(
          JSON.stringify({ exists: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("username", trimmed)
        .limit(1);
      exists = (data && data.length > 0);
    } else if (phone) {
      const trimmed = phone.trim();
      if (trimmed.length < 5) {
        return new Response(
          JSON.stringify({ exists: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data } = await adminClient
        .from("profiles")
        .select("username")
        .eq("phone", trimmed)
        .limit(1);
      exists = (data && data.length > 0);
    }

    return new Response(
      JSON.stringify({ exists }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-username error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
