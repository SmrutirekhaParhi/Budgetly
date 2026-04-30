import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Bell, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["all-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 glass-card rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold">Notifications</h1>
        </div>

        {notifications && notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`glass-card p-3.5 rounded-xl flex items-start gap-3 ${n.is_read ? "opacity-50" : ""}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === "danger" ? "bg-destructive/20" : n.type === "warning" ? "bg-accent/20" : "bg-primary/20"
                }`}>
                  <Bell className={`h-4 w-4 ${
                    n.type === "danger" ? "text-destructive" : n.type === "warning" ? "text-gold" : "text-primary"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{format(new Date(n.created_at), "MMM dd, h:mm a")}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="p-1.5 glass-card rounded-lg shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 rounded-2xl text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No notifications</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
