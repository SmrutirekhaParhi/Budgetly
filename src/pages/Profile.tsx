import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Save, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: budget } = useQuery({
    queryKey: ["budget", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user!.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [savingsTarget, setSavingsTarget] = useState("");

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // Update budget amount when budget data is loaded
  useEffect(() => {
    if (budget) {
      setBudgetAmount(budget.amount?.toString() ?? "");
      setSavingsTarget((budget.savings_target ?? 0).toString());
    }
  }, [budget]);

  const saveProfile = async () => {
    try {
      if (!user?.id) {
        toast.error("User not found");
        return;
      }

      // Update full name in profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user.id);

      if (profileError) {
        toast.error(profileError.message || "Failed to save profile");
        return;
      }

      // Save monthly budget and/or savings target
      const shouldUpsertBudget = (budgetAmount && Number(budgetAmount) > 0) || (savingsTarget && Number(savingsTarget) > 0);
      if (shouldUpsertBudget) {
        const upsertData: any = {
          user_id: user.id,
          amount: budgetAmount ? Number(budgetAmount) : 0,
          month: currentMonth,
          year: currentYear,
        };
        if (savingsTarget && Number(savingsTarget) > 0) upsertData.savings_target = Number(savingsTarget);

        const { error: budgetError } = await supabase.from("budgets").upsert(upsertData, {
          onConflict: 'user_id, month, year'
        });

        if (budgetError) {
          const msg = budgetError.message || "Failed to save budget";
          // If DB doesn't have the column yet, try fallback without savings_target
          if (msg.toLowerCase().includes("savings_target")) {
            const fallback = {
              user_id: user.id,
              amount: upsertData.amount,
              month: currentMonth,
              year: currentYear,
            };
            const { error: fallbackError } = await supabase.from("budgets").upsert(fallback, {
              onConflict: 'user_id, month, year'
            });
            if (fallbackError) {
              toast.error(fallbackError.message || "Failed to save budget");
              return;
            }
            toast.success("Budget saved. (Savings target couldn't be saved because the DB schema is missing the column.)");
          } else {
            toast.error(msg);
            return;
          }
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      queryClient.invalidateQueries({ queryKey: ["budget", user.id, currentMonth, currentYear] });

      toast.success("Profile and budget saved!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("An error occurred");
    }
  };

  const changePin = async () => {
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      toast.error("PIN must be exactly 6 digits");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    setPinLoading(true);

    try {
      if (!user?.id) {
        toast.error("User not found");
        return;
      }

      // Call the Supabase RPC function to set PIN
      const { error } = await supabase.rpc('set_user_pin_on_signup', {
        p_user_id: user.id,
        p_pin_code: newPin
      });

      if (error) {
        toast.error(error.message || "Failed to change PIN");
      } else {
        toast.success("PIN changed successfully!");
        setNewPin("");
        setConfirmPin("");
      }
    } catch (err) {
      console.error("PIN change error:", err);
      toast.error("An error occurred");
    } finally {
      setPinLoading(false);
    }
  };



  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 glass-card rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold">Profile</h1>
        </div>

        {/* User Info */}
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="w-14 h-14 gradient-accent rounded-2xl flex items-center justify-center text-xl font-bold text-accent-foreground">
            {(fullName || "U")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground">{fullName || "User"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="glass-card p-4 rounded-2xl space-y-3">
          <h2 className="text-sm font-semibold">Settings</h2>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
            <input
              type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full glass-card px-3 py-2.5 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Monthly Budget (₹)</label>
            <input
              type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full glass-card px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Monthly Savings Target (₹)</label>
            <input
              type="number"
              value={savingsTarget}
              onChange={(e) => setSavingsTarget(e.target.value)}
              placeholder="e.g. 3000"
              className="w-full glass-card px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button onClick={saveProfile} className="w-full gradient-accent text-accent-foreground font-semibold py-3 rounded-xl active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
            <Save className="h-4 w-4" /> Save Changes
          </button>
        </div>

        {/* Change PIN */}
        <div className="glass-card p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">Change PIN</h2>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">New 6-Digit PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              placeholder="000000"
              className="w-full glass-card px-3 py-2.5 rounded-xl text-sm text-center text-lg tracking-widest text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">{newPin.length}/6 digits</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              placeholder="000000"
              className="w-full glass-card px-3 py-2.5 rounded-xl text-sm text-center text-lg tracking-widest text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {confirmPin && newPin !== confirmPin && (
              <p className="text-xs text-red-500 mt-1">PINs do not match</p>
            )}
          </div>
          <button
            onClick={changePin}
            disabled={pinLoading || newPin.length !== 6 || newPin !== confirmPin}
            className="w-full gradient-accent text-accent-foreground font-semibold py-3 rounded-xl active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Lock className="h-4 w-4" /> {pinLoading ? "Updating..." : "Update PIN"}
          </button>
        </div>



        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full glass-card text-destructive font-medium py-3 rounded-xl active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </AppLayout>
  );
}
