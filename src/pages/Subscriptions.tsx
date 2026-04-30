import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";
import { ArrowLeft, Plus, CreditCard, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isPast, isToday } from "date-fns";

export default function Subscriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: subs } = useQuery({
    queryKey: ["subscriptions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .order("next_due_date");
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleAdd = async () => {
    if (!name.trim() || !amount || !dueDate) {
      toast.error("Fill all fields");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user!.id,
      name: name.trim(),
      amount: parseFloat(amount),
      billing_cycle: cycle,
      next_due_date: dueDate,
    });
    if (error) {
      toast.error("Failed to add subscription");
    } else {
      toast.success("Subscription added!");
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setShowAdd(false);
      setName("");
      setAmount("");
      setDueDate("");
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from("subscriptions").update({ is_active: !currentActive }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  const totalMonthly = subs
    ?.filter((s) => s.is_active)
    .reduce((sum, s) => {
      const amt = Number(s.amount);
      if (s.billing_cycle === "yearly") return sum + amt / 12;
      if (s.billing_cycle === "weekly") return sum + amt * 4;
      return sum + amt;
    }, 0) ?? 0;

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 glass-card rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-bold">Subscriptions</h1>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="p-2 glass-card rounded-xl">
            {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>

        {/* Monthly Total */}
        <div className="glass-card p-4 rounded-2xl text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Monthly</p>
          <p className="text-2xl font-bold tabular-nums mt-1">₹{totalMonthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div className="glass-card p-4 rounded-2xl space-y-3 animate-fade-in">
            <input
              type="text" placeholder="Subscription name" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full glass-card px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="number" placeholder="Amount" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full glass-card px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <select
              value={cycle} onChange={(e) => setCycle(e.target.value)}
              className="w-full glass-card px-3 py-2.5 rounded-xl text-sm text-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input
              type="date" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full glass-card px-3 py-2.5 rounded-xl text-sm text-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleAdd} disabled={saving}
              className="w-full gradient-accent text-accent-foreground font-semibold py-3 rounded-xl active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Subscription"}
            </button>
          </div>
        )}

        {/* List */}
        {subs && subs.length > 0 ? (
          <div className="space-y-2">
            {subs.map((sub) => {
              const isDue = isPast(new Date(sub.next_due_date)) || isToday(new Date(sub.next_due_date));
              return (
                <div
                  key={sub.id}
                  className={`glass-card p-3.5 rounded-xl flex items-center justify-between ${
                    !sub.is_active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDue ? "bg-destructive/20" : "bg-primary/20"}`}>
                      <CreditCard className={`h-5 w-5 ${isDue ? "text-destructive" : "text-primary"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sub.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sub.billing_cycle} · Due {format(new Date(sub.next_due_date), "MMM dd")}
                        {isDue && <span className="text-destructive ml-1">⚠ Due</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold tabular-nums">₹{Number(sub.amount).toLocaleString("en-IN")}</p>
                    <button
                      onClick={() => toggleActive(sub.id, sub.is_active)}
                      className={`w-8 h-5 rounded-full transition-colors ${sub.is_active ? "bg-primary" : "bg-muted"}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-foreground transition-transform mx-0.5 ${sub.is_active ? "translate-x-3" : ""}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-8 rounded-2xl text-center">
            <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No subscriptions yet</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
