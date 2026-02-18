import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Announcement {
  id: string;
  title: string;
  new_features: string | null;
  changes_fixes: string | null;
  published_at: string;
  created_by: string;
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_announcements")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { title: string; new_features: string; changes_fixes: string }) => {
      const { error } = await supabase.from("platform_announcements").insert({
        title: params.title,
        new_features: params.new_features,
        changes_fixes: params.changes_fixes,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Annonce publiée");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Annonce supprimée");
    },
  });
}

export function useLatestAnnouncement() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["latest-announcement", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Get latest announcement
      const { data: announcements } = await supabase
        .from("platform_announcements")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(1);

      if (!announcements || announcements.length === 0) return null;

      const latest = announcements[0] as Announcement;

      // Check if user already read it
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("id")
        .eq("user_id", user.id)
        .eq("announcement_id", latest.id);

      if (reads && reads.length > 0) return null;
      return latest;
    },
    enabled: !!user,
  });
}

export function useMarkAnnouncementRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) return;
      const { error } = await supabase.from("announcement_reads").insert({
        user_id: user.id,
        announcement_id: announcementId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["latest-announcement"] });
    },
  });
}
