import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EmployeeSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
  role: z.enum(["employee", "manager", "admin"]),
  allowedPages: z.array(z.string().max(50)).max(20).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize adminClient first - it can validate ES256 tokens from Lovable Cloud
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = userData.user.id;

    // anonClient with user token for RLS-protected role check
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify super_admin role
    const { data: roleData } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", ownerId)
      .single();

    if (roleData?.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Seul un super admin peut créer des employés" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate body with Zod
    const rawBody = await req.json();
    const parseResult = EmployeeSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Données invalides", details: parseResult.error.issues.map(i => i.message) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fullName, username, password, role, allowedPages } = parseResult.data;

    // Check username uniqueness
    const { data: existingUser } = await anonClient
      .from("profiles")
      .select("user_id")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Ce nom d'utilisateur est déjà pris" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = `${username.toLowerCase()}@repairpro.local`;

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        username: username.toLowerCase(),
      },
    });

    if (createError) {
      console.error("Create user error:", createError);
      // Surface specific known errors to the client
      if ((createError as any).code === "email_exists" || createError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Ce nom d'utilisateur est déjà utilisé (compte existant)" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création du compte: " + createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;

    // Fix role from super_admin (set by trigger) to the chosen role
    await adminClient
      .from("user_roles")
      .update({ role })
      .eq("user_id", newUserId);

    // Exempt employees from verification (trigger sets pending_verification for all)
    await adminClient
      .from("profiles")
      .update({
        verification_status: "verified",
        verification_deadline: null,
        is_locked: false,
      })
      .eq("user_id", newUserId);

    // Add to team_members
    await adminClient.from("team_members").insert({
      owner_id: ownerId,
      member_user_id: newUserId,
      role,
      allowed_pages: allowedPages || ["/", "/pos"],
    });

    return new Response(
      JSON.stringify({ userId: newUserId, username: username.toLowerCase() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
