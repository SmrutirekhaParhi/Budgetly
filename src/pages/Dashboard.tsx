import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Bell, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
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

  const { data: expenses } = useQuery({
    queryKey: ["expenses", user?.id, currentMonth],
    queryFn: async () => {
      const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const { data } = await supabase
        .from("expenses")
        .select("*, categories(name, color, icon)")
        .eq("user_id", user!.id)
        .gte("expense_date", startOfMonth)
        .order("expense_date", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalSpent = expenses?.reduce((sum, e) => {
    return e.type === "EXPENSE" ? sum + Number(e.amount) : sum;
  }, 0) ?? 0;
  const budgetAmount = budget?.amount ?? 0;
  const remaining = budgetAmount - totalSpent;
  const usagePct = budgetAmount > 0 ? Math.min((totalSpent / budgetAmount) * 100, 100) : 0;
  const currency = profile?.currency ?? "₹";
  const savingsTarget = budget?.savings_target ?? 0;
  const savedAmount = Math.max(0, budgetAmount - totalSpent);
  const extraBeyondPct = savingsTarget > 0 ? Math.max(0, ((savedAmount - Number(savingsTarget)) / Number(savingsTarget)) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-xl font-bold text-foreground">
              {profile?.full_name ?? "User"}
            </h1>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2 glass-card rounded-xl"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {(notifications?.length ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {notifications!.length}
              </span>
            )}
          </button>
        </div>

        {/* Budget Card */}
        <div className="glass-card p-5 rounded-2xl space-y-4 animate-fade-in stagger-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Budget</span>
            <Wallet className="h-4 w-4 text-gold" />
          </div>

          {budgetAmount > 0 ? (
            <>
              <div className="flex items-end gap-4">
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {currency}{budgetAmount.toLocaleString("en-IN")}
                </p>
                {savingsTarget > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <div className="text-[10px] uppercase tracking-wider">Savings Target</div>
                    <div className="font-semibold tabular-nums">{currency}{Number(savingsTarget).toLocaleString("en-IN")}</div>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${usagePct}%`,
                        background: usagePct >= 80
                          ? "hsl(0 72% 51%)"
                            : usagePct > 50
                          ? "hsl(42 85% 55%)"
                          : "hsl(145 50% 40%)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Spent: {currency}{totalSpent.toLocaleString("en-IN")}</span>
                  <span>{Math.round(usagePct)}% used</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-[10px] text-muted-foreground">Spent</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{currency}{totalSpent.toLocaleString("en-IN")}</p>
                </div>
                <div className="glass-card p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] text-muted-foreground">Remaining</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{currency}{remaining.toLocaleString("en-IN")}</p>
                </div>
              </div>
              {savingsTarget > 0 && (
                <div className="mt-3">
                  <div className="glass-card p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">Monthly Savings Target</div>
                        <div className="text-sm font-semibold tabular-nums">{currency}{Number(savingsTarget).toLocaleString("en-IN")}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Saved</div>
                        <div className="text-sm font-semibold tabular-nums">{currency}{savedAmount.toLocaleString("en-IN")}</div>
                        {savedAmount >= Number(savingsTarget) && (
                          <div className="text-green-500 text-sm mt-1">
                            <div className="font-semibold">Congratulations</div>
                            <div className="text-xs mt-1">{extraBeyondPct.toFixed(1)}% beyond your savings target</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm mb-3">No budget set for this month</p>
              <button
                onClick={() => navigate("/profile")}
                className="gradient-accent text-accent-foreground text-sm font-medium px-4 py-2 rounded-xl active:scale-95 transition-transform"
              >
                Set Budget
              </button>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="animate-fade-in stagger-2">
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent Transactions</h2>
          {expenses && expenses.length > 0 ? (
            <div className="space-y-2">
              {expenses.map((expense) => {
                const cat = expense.categories as { name: string; color: string | null; icon: string | null } | null;
                return (
                  <div key={expense.id} className="glass-card p-3.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: (cat?.color ?? "#4CAF50") + "22", color: cat?.color ?? "#4CAF50" }}
                      >
                        {(cat?.name ?? "?")[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{expense.description || cat?.name || "Expense"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(expense.expense_date), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${
                      expense.type === "INCOME" 
                        ? "text-green-500" 
                        : "text-destructive"
                    }`}>
                      {expense.type === "INCOME" ? "+" : "-"}{currency}{Number(expense.amount).toLocaleString("en-IN")}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-6 rounded-xl text-center">
              <p className="text-muted-foreground text-sm">No expenses yet this month</p>
              <button
                onClick={() => navigate("/add-expense")}
                className="text-gold text-sm font-medium mt-2"
              >
                Add your first expense →
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
