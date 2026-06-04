import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { 
  ArrowLeft,
  ShoppingCart,
  Car,
  UtensilsCrossed,
  Gamepad2,
  Receipt,
  GraduationCap,
  ShoppingBag,
  Heart,
  Shirt,
  Monitor,
  Wallet,
  Home,
  Search,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";

const ICON_MAP: Record<string, any> = {
  ShoppingCart,
  Car,
  UtensilsCrossed,
  Gamepad2,
  Receipt,
  GraduationCap,
  ShoppingBag,
  Heart,
  Shirt,
  Monitor,
  Wallet,
  Home,
};

type Period = "monthly" | "yearly";

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("monthly");
  const [searchQuery, setSearchQuery] = useState("");
  const now = new Date();

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

  const currency = profile?.currency ?? "₹";

  const { data: expenses } = useQuery({
    queryKey: ["all-expenses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("*, categories(name, color, icon)")
        .eq("user_id", user!.id)
        .order("expense_date", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Filter expenses according to selected period
  const filteredExpenses = (expenses ?? []).filter((e) => {
    const d = new Date(e.expense_date);
    if (period === "monthly") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    // yearly
    return d.getFullYear() === now.getFullYear();
  });

  // Search-filtered + sorted (always newest first) for transaction list
  const displayExpenses = filteredExpenses
    .filter((e) => {
      if (searchQuery.trim() === "") return true;
      const q = searchQuery.toLowerCase();
      const desc = (e.description ?? "").toLowerCase();
      const catName = ((e.categories as any)?.name ?? "uncategorized").toLowerCase();
      return desc.includes(q) || catName.includes(q);
    })
    .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

  // Group by date
  const formatDateHeader = (dateStr: string) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const toLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (dateStr === toLocal(today)) return "Today";
    if (dateStr === toLocal(yesterday)) return "Yesterday";
    return format(new Date(dateStr), "MMMM dd, yyyy");
  };

  const groupedExpenses: { dateStr: string; items: typeof displayExpenses }[] = [];
  displayExpenses.forEach((item) => {
    const dateStr = item.expense_date;
    let group = groupedExpenses.find((g) => g.dateStr === dateStr);
    if (!group) {
      group = { dateStr, items: [] };
      groupedExpenses.push(group);
    }
    group.items.push(item);
  });

  // Aggregate by category
  const categoryMap = new Map<string, { name: string; color: string; total: number }>();
  filteredExpenses.forEach((e) => {
    const cat = e.categories as { name: string; color: string | null } | null;
    const name = cat?.name ?? "Uncategorized";
    const existing = categoryMap.get(name);
    if (existing) {
      existing.total += Number(e.amount);
    } else {
      categoryMap.set(name, { name, color: cat?.color ?? "#888", total: Number(e.amount) });
    }
  });
  const categoryData = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  const totalExpenses = categoryData.reduce((s, c) => s + c.total, 0);

  // Chart data based on period
  const chartData = (() => {
    if (!expenses?.length) return [];
    if (period === "monthly") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const map = new Map<string, number>();
      months.forEach((m) => map.set(m, 0));
      expenses.forEach((e) => {
        const date = new Date(e.expense_date);
        if (date.getFullYear() === now.getFullYear()) {
          const key = months[date.getMonth()];
          map.set(key, (map.get(key) ?? 0) + Number(e.amount));
        }
      });
      return Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
    }
    // yearly
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const year = new Date(e.expense_date).getFullYear().toString();
      map.set(year, (map.get(year) ?? 0) + Number(e.amount));
    });
    return Array.from(map.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => Number(a.name) - Number(b.name));
  })();

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 glass-card rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold">Spending</h1>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2 glass-card p-1 rounded-xl">
          {(["monthly", "yearly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                period === p ? "gradient-accent text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              {p === "monthly" ? "This Month" : "This Year"}
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Spent</p>
          <p className="text-3xl font-bold tabular-nums mt-1">{currency}{totalExpenses.toLocaleString("en-IN")}</p>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="glass-card p-4 rounded-2xl h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(42, 85%, 55%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(42, 85%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: "hsl(145, 10%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(145, 35%, 12%)",
                    border: "1px solid hsl(145, 20%, 20%)",
                    borderRadius: "12px",
                    color: "hsl(45, 20%, 95%)",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${currency}${value.toLocaleString("en-IN")}`, "Spent"]}
                />
                <Area type="monotone" dataKey="amount" stroke="hsl(42, 85%, 55%)" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="glass-card p-8 rounded-2xl text-center">
            <p className="text-muted-foreground text-sm">No expense data available</p>
          </div>
        )}

        {/* Category Breakdown */}
        <div>
          <h2 className="text-sm font-semibold mb-3">By Category</h2>
          {categoryData.length > 0 ? (
            <div className="space-y-2">
              {categoryData.map((cat) => {
                const pct = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
                return (
                  <div key={cat.name} className="glass-card p-3 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{currency}{cat.total.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-6 rounded-xl text-center">
              <p className="text-muted-foreground text-sm">No data to display</p>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>All Transactions</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                {displayExpenses.length}
              </span>
            </h2>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-card pl-10 pr-9 py-2.5 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1.5 focus:ring-accent/50 transition-shadow"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground/60 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Transactions List — always grouped by date, newest first */}
          {displayExpenses.length > 0 ? (
            <div className="space-y-4">
              {groupedExpenses.map((group) => (
                <div key={group.dateStr} className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                    {formatDateHeader(group.dateStr)}
                  </p>
                  <div className="space-y-2">
                    {group.items.map((expense) => {
                      const cat = expense.categories as { name: string; color: string | null; icon: string | null } | null;
                      const IconComponent = cat?.icon ? ICON_MAP[cat.icon] : null;
                      return (
                        <div
                          key={expense.id}
                          className="glass-card p-3 rounded-xl flex items-center justify-between hover:bg-accent/5 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: (cat?.color ?? "#4CAF50") + "22",
                                color: cat?.color ?? "#4CAF50"
                              }}
                            >
                              {IconComponent ? (
                                <IconComponent className="h-4 w-4" />
                              ) : (
                                <span className="text-xs font-bold">{(cat?.name ?? "?")[0]}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">
                                {expense.description || cat?.name || "Transaction"}
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                {cat?.name ?? "Uncategorized"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-semibold tabular-nums ${
                              expense.type === "INCOME" ? "text-green-500" : "text-destructive"
                            }`}>
                              {expense.type === "INCOME" ? "+" : "-"}{currency}{Number(expense.amount).toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 rounded-xl text-center">
              <p className="text-muted-foreground text-xs">
                {searchQuery
                  ? "No transactions match your search"
                  : "No transactions for this period"}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
