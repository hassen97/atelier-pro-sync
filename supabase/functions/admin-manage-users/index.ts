import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ActionSchema = z.object({
  action: z.enum(["list", "delete", "reset-password", "create", "lock", "unlock", "get-revenue", "get-activity", "update-settings"]).optional(),
  userId: z.string().uuid().optional(),
  newPassword: z.string().min(8).max(128).optional(),
  fullName: z.string().trim().min(1).max(100).optional(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  password: z.string().min(8).max(128).optional(),
  country: z.string().min(2).max(3).optional(),
  currency: z.string().min(3).max(4).optional(),
});

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

    // Parse and validate body
    if (req.method === "POST" || req.method === "GET") {
      const rawBody = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const parseResult = ActionSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return new Response(
          JSON.stringify({ error: "Invalid input", details: parseResult.error.issues.map(i => i.message) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const body = parseResult.data;
      const { action } = body;

      // List all shop owners with stats (default)
      if (!action || action === "list") {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, full_name, username, created_at, is_locked, last_online_at, phone, whatsapp_phone")
          .order("created_at", { ascending: false });

        const { data: roles } = await adminClient
          .from("user_roles")
          .select("user_id, role");

        const { data: teamCounts } = await adminClient
          .from("team_members")
          .select("owner_id")
          .eq("status", "active");

        const { data: repairCounts } = await adminClient
          .from("repairs")
          .select("user_id");

        const { data: shopSettings } = await adminClient
          .from("shop_settings")
          .select("user_id, shop_name, country, currency");

        const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
        const teamCountMap = new Map<string, number>();
        (teamCounts || []).forEach((t: any) => {
          teamCountMap.set(t.owner_id, (teamCountMap.get(t.owner_id) || 0) + 1);
        });
        const repairCountMap = new Map<string, number>();
        (repairCounts || []).forEach((r: any) => {
          repairCountMap.set(r.user_id, (repairCountMap.get(r.user_id) || 0) + 1);
        });
        const shopMap = new Map((shopSettings || []).map((s: any) => [s.user_id, { shop_name: s.shop_name, country: s.country, currency: s.currency }]));

        const owners = (profiles || [])
          .filter((p: any) => roleMap.get(p.user_id) === "super_admin")
          .map((p: any) => ({
            ...p,
            role: roleMap.get(p.user_id),
            team_count: teamCountMap.get(p.user_id) || 0,
            repair_count: repairCountMap.get(p.user_id) || 0,
            shop_name: shopMap.get(p.user_id)?.shop_name || "Mon Atelier",
            country: shopMap.get(p.user_id)?.country || "TN",
            currency: shopMap.get(p.user_id)?.currency || "TND",
          }));

        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const activeNowCount = owners.filter((o: any) => o.last_online_at && o.last_online_at > fiveMinAgo).length;

        const stats = {
          total_owners: owners.length,
          total_employees: (teamCounts || []).length,
          total_repairs: (repairCounts || []).length,
          active_now_count: activeNowCount,
        };

        return new Response(JSON.stringify({ owners, stats }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "delete") {
        if (!body.userId) {
          return new Response(JSON.stringify({ error: "userId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient.auth.admin.deleteUser(body.userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "reset-password") {
        if (!body.userId || !body.newPassword) {
          return new Response(
            JSON.stringify({ error: "userId and newPassword required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await adminClient.auth.admin.updateUserById(body.userId, {
          password: body.newPassword,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "create") {
        if (!body.fullName || !body.username || !body.password) {
          return new Response(
            JSON.stringify({ error: "fullName, username and password required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const email = `${body.username.toLowerCase()}@repairpro.local`;
        const { data: newUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email,
            password: body.password,
            email_confirm: true,
            user_metadata: {
              full_name: body.fullName,
              username: body.username.toLowerCase(),
              ...(body.country && { country: body.country }),
              ...(body.currency && { currency: body.currency }),
            },
          });
        if (createError) throw createError;
        return new Response(
          JSON.stringify({ success: true, userId: newUser.user.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "lock") {
        if (!body.userId) {
          return new Response(JSON.stringify({ error: "userId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await adminClient.from("profiles").update({ is_locked: true }).eq("user_id", body.userId);
        const { error } = await adminClient.auth.admin.updateUserById(body.userId, {
          ban_duration: "876000h",
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "unlock") {
        if (!body.userId) {
          return new Response(JSON.stringify({ error: "userId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await adminClient.from("profiles").update({ is_locked: false }).eq("user_id", body.userId);
        const { error } = await adminClient.auth.admin.updateUserById(body.userId, {
          ban_duration: "none",
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get-revenue") {
        const { data: sales } = await adminClient
          .from("sales")
          .select("user_id, total_amount");
        
        let totalRevenue = 0;
        const revenueByOwner = new Map<string, number>();
        (sales || []).forEach((s: any) => {
          totalRevenue += Number(s.total_amount || 0);
          revenueByOwner.set(s.user_id, (revenueByOwner.get(s.user_id) || 0) + Number(s.total_amount || 0));
        });

        const { data: repairs } = await adminClient
          .from("repairs")
          .select("user_id, total_cost");
        
        let totalRepairRevenue = 0;
        (repairs || []).forEach((r: any) => {
          totalRepairRevenue += Number(r.total_cost || 0);
        });

        return new Response(JSON.stringify({ 
          total_revenue: totalRevenue + totalRepairRevenue,
          sales_revenue: totalRevenue,
          repair_revenue: totalRepairRevenue,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get-activity") {
        const { data: recentRepairs } = await adminClient
          .from("repairs")
          .select("id, device_model, status, created_at, user_id, total_cost")
          .order("created_at", { ascending: false })
          .limit(10);

        const { data: recentSales } = await adminClient
          .from("sales")
          .select("id, total_amount, created_at, user_id, payment_method")
          .order("created_at", { ascending: false })
          .limit(10);

        const userIds = new Set<string>();
        (recentRepairs || []).forEach((r: any) => userIds.add(r.user_id));
        (recentSales || []).forEach((s: any) => userIds.add(s.user_id));
        
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, full_name, username")
          .in("user_id", Array.from(userIds));

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        const { data: shopSettings } = await adminClient
          .from("shop_settings")
          .select("user_id, shop_name")
          .in("user_id", Array.from(userIds));

        const shopMap = new Map((shopSettings || []).map((s: any) => [s.user_id, s.shop_name]));

        const activity = [
          ...(recentRepairs || []).map((r: any) => ({
            type: "repair" as const,
            id: r.id,
            description: `Réparation: ${r.device_model}`,
            amount: r.total_cost,
            status: r.status,
            created_at: r.created_at,
            shop_name: shopMap.get(r.user_id) || profileMap.get(r.user_id)?.full_name || "Inconnu",
          })),
          ...(recentSales || []).map((s: any) => ({
            type: "sale" as const,
            id: s.id,
            description: `Vente (${s.payment_method})`,
            amount: s.total_amount,
            status: "completed",
            created_at: s.created_at,
            shop_name: shopMap.get(s.user_id) || profileMap.get(s.user_id)?.full_name || "Inconnu",
          })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         .slice(0, 15);

        return new Response(JSON.stringify({ activity }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "update-settings") {
        if (!body.userId) {
          return new Response(JSON.stringify({ error: "userId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const updateData: Record<string, unknown> = {};
        if (body.country) updateData.country = body.country;
        if (body.currency) updateData.currency = body.currency;
        updateData.updated_at = new Date().toISOString();

        const { error } = await adminClient
          .from("shop_settings")
          .update(updateData)
          .eq("user_id", body.userId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Admin action error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
