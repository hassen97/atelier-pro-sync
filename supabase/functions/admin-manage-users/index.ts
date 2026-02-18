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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub;

    // Verify platform_admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    if (roleData?.role !== "platform_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle GET - list all shop owners with stats
    if (req.method === "GET") {
      // Get all profiles
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, full_name, username, created_at")
        .order("created_at", { ascending: false });

      // Get all roles
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      // Get team member counts per owner
      const { data: teamCounts } = await adminClient
        .from("team_members")
        .select("owner_id")
        .eq("status", "active");

      // Get repair counts per user
      const { data: repairCounts } = await adminClient
        .from("repairs")
        .select("user_id");

      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
      const teamCountMap = new Map<string, number>();
      (teamCounts || []).forEach((t: any) => {
        teamCountMap.set(t.owner_id, (teamCountMap.get(t.owner_id) || 0) + 1);
      });
      const repairCountMap = new Map<string, number>();
      (repairCounts || []).forEach((r: any) => {
        repairCountMap.set(r.user_id, (repairCountMap.get(r.user_id) || 0) + 1);
      });

      // Filter only super_admin (shop owners), exclude platform_admin and employees
      const owners = (profiles || [])
        .filter((p: any) => roleMap.get(p.user_id) === "super_admin")
        .map((p: any) => ({
          ...p,
          role: roleMap.get(p.user_id),
          team_count: teamCountMap.get(p.user_id) || 0,
          repair_count: repairCountMap.get(p.user_id) || 0,
        }));

      const stats = {
        total_owners: owners.length,
        total_employees: (teamCounts || []).length,
        total_repairs: (repairCounts || []).length,
      };

      return new Response(JSON.stringify({ owners, stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle POST actions
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "delete") {
        const { userId } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "reset-password") {
        const { userId, newPassword } = body;
        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: "userId and newPassword required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          password: newPassword,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "create") {
        const { fullName, username, password } = body;
        if (!fullName || !username || !password) {
          return new Response(
            JSON.stringify({ error: "fullName, username and password required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const email = `${username.toLowerCase()}@repairpro.local`;
        const { data: newUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, username: username.toLowerCase() },
          });
        if (createError) throw createError;
        return new Response(
          JSON.stringify({ success: true, userId: newUser.user.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
