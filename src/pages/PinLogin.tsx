import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function PinLogin() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6) {
      toast.error("PIN must be 6 digits");
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        toast.error("User not authenticated. Please sign in again.");
        navigate("/");
        return;
      }

      // Verify PIN using Supabase RPC
      const { data, error } = await (supabase.rpc(
        'verify_user_pin',
        {
          user_email: user.email!,
          pin_input: pin
        }
      ) as any);

      if (error) {
        toast.error(error.message || "Invalid PIN");
      } else if (data && Array.isArray(data) && data[0]?.success) {
        toast.success("PIN verified!");
        navigate("/dashboard");
      } else if (data && Array.isArray(data) && !data[0]?.success) {
        toast.error(data[0]?.message || "Invalid PIN");
      } else {
        toast.error("Invalid PIN");
      }
    } catch (err) {
      console.error("PIN login error:", err);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-10">
          <div className="gradient-accent rounded-2xl p-4 mb-4 shadow-lg shadow-accent/20">
            <Lock className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mt-2">Enter your PIN to continue</p>
        </div>

        <form onSubmit={handlePinLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              6-Digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              className="w-full glass-card px-4 py-3 rounded-xl text-foreground text-center text-4xl tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              placeholder="●●●●●●"
              required
            />
            <p className="text-xs text-muted-foreground mt-2">{pin.length}/6 digits</p>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="w-full gradient-accent text-accent-foreground font-semibold py-3.5 rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 shadow-lg shadow-accent/20"
          >
            {loading ? "Verifying..." : "Unlock"}
          </button>
        </form>

        <button
          onClick={handleSignOut}
          className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-2 px-4 rounded-lg hover:bg-muted/50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
