import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Wallet } from "lucide-react";

export default function Auth() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        // Sign up flow
        if (!email || !password || !fullName) {
          toast.error("Please fill in all fields");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message || "Sign up failed");
        } else {
          toast.success("Account created! Now set your PIN.");
          navigate("/pin-setup");
        }
      } else {
        // Sign in flow
        if (!email || !password) {
          toast.error("Please enter email and password");
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          console.error("Sign in error:", error);
          toast.error(error?.message || "Invalid credentials");
        } else {
          toast.success("Signed in! Now enter your PIN.");
          navigate("/pin-login");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
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
            <Wallet className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Budgetly</h1>
          <p className="text-muted-foreground text-sm mt-1">Student Financial OS</p>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setIsSignup(false)}
            className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
              !isSignup
                ? "gradient-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignup(true)}
            className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
              isSignup
                ? "gradient-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full glass-card px-4 py-3 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                placeholder="John Doe"
                required={isSignup}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full glass-card px-4 py-3 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-card px-4 py-3 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow pr-12"
                placeholder={isSignup ? "At least 6 characters" : "Your password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isSignup && password && password.length < 6 && (
              <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-accent text-accent-foreground font-semibold py-3.5 rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 shadow-lg shadow-accent/20"
          >
            {loading ? "Loading..." : isSignup ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          {isSignup
            ? "After sign up, you'll set up your PIN for easy login"
            : "Sign in with your email and password, then use PIN to access"}
        </p>
      </div>
    </div>
  );
}
