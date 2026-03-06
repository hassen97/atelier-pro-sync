import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ActionSchema = z.object({
  action: z.enum([
    "list", "delete", "reset-password", "create", "lock", "unlock",
    "get-revenue", "get-activity", "update-settings",
    "list-reset-requests", "update-reset-request", "approve-signup",
    "get-platform-settings", "update-platform-setting",
    "list-employees", "delete-employee", "get-shop-details",
  ]).optional(),
  userId: z.string().uuid().optional(),
  newPassword: z.string().min(8).max(128).optional(),
  fullName: z.string().trim().min(1).max(100).optional(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  password: z.string().min(8).max(128).optional(),
  country: z.string().min(2).max(3).optional(),
  currency: z.string().min(3).max(4).optional(),
  requestId: z.string().uuid().optional(),
  status: z.string().optional(),
  settingKey: z.string().optional(),
  settingValue: z.string().optional(),
  memberId: z.string().uuid().optional(),
  employeeUserId: z.string().uuid().optional(),
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
          .select("user_id, full_name, username, created_at, is_locked, last_online_at, phone, whatsapp_phone, email")
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
            phone: p.phone || null,
            whatsapp_phone: p.whatsapp_phone || null,
            email: p.email || null,
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

      if (action === "unlock" || action === "approve-signup") {
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

      if (action === "list-reset-requests") {
        const { data: requests, error } = await adminClient
          .from("password_reset_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Join with profiles to get phone/whatsapp for each username
        const usernames = (requests || []).map((r: any) => r.username);
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("username, phone, whatsapp_phone, user_id, full_name")
          .in("username", usernames);

        const profileMap = new Map((profiles || []).map((p: any) => [p.username, p]));

        const enrichedRequests = (requests || []).map((r: any) => {
          const profile = profileMap.get(r.username);
          return {
            ...r,
            // Table phone takes priority over profile join
            phone: r.phone || profile?.phone || null,
            whatsapp_phone: profile?.whatsapp_phone || null,
            user_id: profile?.user_id || null,
            full_name: profile?.full_name || null,
          };
        });

        return new Response(JSON.stringify({ requests: enrichedRequests }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "update-reset-request") {
        if (!body.requestId || !body.status) {
          return new Response(JSON.stringify({ error: "requestId and status required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient
          .from("password_reset_requests")
          .update({ status: body.status })
          .eq("id", body.requestId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get-platform-settings") {
        const { data, error } = await adminClient
          .from("platform_settings")
          .select("key, value, updated_at");
        if (error) throw error;
        return new Response(JSON.stringify({ settings: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "update-platform-setting") {
        if (!body.settingKey || body.settingValue === undefined) {
          return new Response(JSON.stringify({ error: "settingKey and settingValue required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient
          .from("platform_settings")
          .update({ value: body.settingValue, updated_at: new Date().toISOString() })
          .eq("key", body.settingKey);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "list-employees") {
        const { data: members } = await adminClient
          .from("team_members")
          .select("id, owner_id, member_user_id, role, created_at, allowed_pages, status");

        if (!members || members.length === 0) {
          return new Response(JSON.stringify({ employees: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const memberUserIds = members.map((m: any) => m.member_user_id);
        const ownerIds = [...new Set(members.map((m: any) => m.owner_id))];

        const [{ data: memberProfiles }, { data: ownerProfiles }, { data: shopSettings }] = await Promise.all([
          adminClient.from("profiles").select("user_id, full_name, username, phone, last_online_at").in("user_id", memberUserIds),
          adminClient.from("profiles").select("user_id, username, full_name").in("user_id", ownerIds as string[]),
          adminClient.from("shop_settings").select("user_id, shop_name").in("user_id", ownerIds as string[]),
        ]);

        const memberProfileMap = new Map((memberProfiles || []).map((p: any) => [p.user_id, p]));
        const ownerProfileMap = new Map((ownerProfiles || []).map((p: any) => [p.user_id, p]));
        const shopMap = new Map((shopSettings || []).map((s: any) => [s.user_id, s.shop_name]));

        const employees = members.map((m: any) => ({
          id: m.id,
          member_user_id: m.member_user_id,
          owner_id: m.owner_id,
          role: m.role,
          status: m.status,
          created_at: m.created_at,
          allowed_pages: m.allowed_pages || [],
          full_name: memberProfileMap.get(m.member_user_id)?.full_name || null,
          username: memberProfileMap.get(m.member_user_id)?.username || null,
          phone: memberProfileMap.get(m.member_user_id)?.phone || null,
          last_online_at: memberProfileMap.get(m.member_user_id)?.last_online_at || null,
          owner_username: ownerProfileMap.get(m.owner_id)?.username || null,
          owner_full_name: ownerProfileMap.get(m.owner_id)?.full_name || null,
          shop_name: shopMap.get(m.owner_id) || "Mon Atelier",
        }));

        return new Response(JSON.stringify({ employees }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get-shop-details") {
        if (!body.userId) {
          return new Response(JSON.stringify({ error: "userId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const targetUserId = body.userId;

        const [
          { data: profile },
          { data: shopSettings },
          { data: products },
          { data: customers },
          { data: sales },
          { data: repairs },
          { data: expenses },
          { data: suppliers },
          { data: teamMembers },
          { data: recentSales },
          { data: recentRepairs },
        ] = await Promise.all([
          adminClient.from("profiles").select("*").eq("user_id", targetUserId).single(),
          adminClient.from("shop_settings").select("*").eq("user_id", targetUserId).single(),
          adminClient.from("products").select("id").eq("user_id", targetUserId),
          adminClient.from("customers").select("id").eq("user_id", targetUserId),
          adminClient.from("sales").select("id, total_amount").eq("user_id", targetUserId),
          adminClient.from("repairs").select("id, total_cost, status").eq("user_id", targetUserId),
          adminClient.from("expenses").select("id, amount").eq("user_id", targetUserId),
          adminClient.from("suppliers").select("id").eq("user_id", targetUserId),
          adminClient.from("team_members").select("id, member_user_id, role, status, created_at").eq("owner_id", targetUserId),
          adminClient.from("sales").select("id, total_amount, payment_method, created_at").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(5),
          adminClient.from("repairs").select("id, device_model, total_cost, status, created_at").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(5),
        ]);

        // Get team member profiles
        const memberUserIds = (teamMembers || []).map((m: any) => m.member_user_id);
        let teamList: any[] = [];
        if (memberUserIds.length > 0) {
          const { data: memberProfiles } = await adminClient
            .from("profiles")
            .select("user_id, full_name, username, last_online_at")
            .in("user_id", memberUserIds);
          const mpMap = new Map((memberProfiles || []).map((p: any) => [p.user_id, p]));
          teamList = (teamMembers || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            status: m.status,
            created_at: m.created_at,
            full_name: mpMap.get(m.member_user_id)?.full_name || null,
            username: mpMap.get(m.member_user_id)?.username || null,
            last_online_at: mpMap.get(m.member_user_id)?.last_online_at || null,
          }));
        }

        const totalSalesRevenue = (sales || []).reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
        const totalRepairRevenue = (repairs || []).reduce((sum: number, r: any) => sum + Number(r.total_cost || 0), 0);
        const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
        const pendingRepairs = (repairs || []).filter((r: any) => r.status === "pending" || r.status === "in_progress").length;

        return new Response(JSON.stringify({
          profile,
          shop: shopSettings,
          counts: {
            products: (products || []).length,
            customers: (customers || []).length,
            sales: (sales || []).length,
            repairs: (repairs || []).length,
            expenses: (expenses || []).length,
            suppliers: (suppliers || []).length,
            team_members: (teamMembers || []).length,
            pending_repairs: pendingRepairs,
          },
          revenue: {
            sales: totalSalesRevenue,
            repairs: totalRepairRevenue,
            expenses: totalExpenses,
          },
          team: teamList,
          recent_sales: recentSales || [],
          recent_repairs: recentRepairs || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "delete-employee") {
        if (!body.memberId || !body.employeeUserId) {
          return new Response(JSON.stringify({ error: "memberId and employeeUserId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await adminClient.from("team_members").delete().eq("id", body.memberId);
        const { error } = await adminClient.auth.admin.deleteUser(body.employeeUserId);
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
