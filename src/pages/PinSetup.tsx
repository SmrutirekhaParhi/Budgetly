import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function PinSetup() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      toast.error("PIN must be exactly 6 digits");
      return;
    }

    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        toast.error("User not authenticated");
        return;
      }

      const { error } = await (supabase.rpc("set_user_pin_on_signup", {
        p_user_id: user.id,
        p_pin_code: pin,
      }) as any);

      if (error) {
        toast.error(error.message || "Failed to set PIN");
      } else {
        toast.success("PIN set successfully!");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("PIN setup error:", err);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-10">
          <div className="gradient-accent rounded-2xl p-4 mb-4 shadow-lg shadow-accent/20">
            <Lock className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Set Your PIN</h1>
          <p className="text-muted-foreground text-sm mt-2">This PIN will be used for quick access</p>
        </div>

        <form onSubmit={handleSetPin} className="space-y-4">
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
              className="w-full glass-card px-4 py-3 rounded-xl text-foreground text-center text-2xl tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              placeholder="000000"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">{pin.length}/6 digits</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Confirm PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              className="w-full glass-card px-4 py-3 rounded-xl text-foreground text-center text-2xl tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              placeholder="000000"
              required
            />
            {confirmPin && pin !== confirmPin && (
              <p className="text-xs text-red-500 mt-1">PINs do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 6 || pin !== confirmPin}
            className="w-full gradient-accent text-accent-foreground font-semibold py-3.5 rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 shadow-lg shadow-accent/20"
          >
            {loading ? "Setting PIN..." : "Continue to Dashboard"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You'll use this PIN to log in next time
        </p>
      </div>
    </div>
  );
}
