import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type Period = "daily" | "monthly" | "yearly";

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("monthly");
  const now = new Date();
  

  const { data: expenses } = useQuery({
    queryKey: ["all-expenses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("*, categories(name, color)")
        .eq("user_id", user!.id)
        .order("expense_date", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });
  // Fetch budgets for current month and year (used for savings calculations)
  const { data: monthlyBudget } = useQuery({
    queryKey: ["budget", user?.id, now.getMonth() + 1, now.getFullYear()],
    queryFn: async () => {
      const { data } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user!.id)
        .eq("month", now.getMonth() + 1)
        .eq("year", now.getFullYear())
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: yearlyBudgets } = useQuery({
    queryKey: ["budgets-year", user?.id, now.getFullYear()],
    queryFn: async () => {
      const { data } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user!.id)
        .eq("year", now.getFullYear());
      return data ?? [];
    },
    enabled: !!user,
  });

  // Filter expenses according to selected period
  const filteredExpenses = (expenses ?? []).filter((e) => {
    const d = new Date(e.expense_date);
    if (period === "daily") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === "monthly") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    // yearly
    return d.getFullYear() === now.getFullYear();
  });

  // Aggregate by category (based on filtered expenses)
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

  const monthlyBudgetAmount = monthlyBudget?.amount ?? 0;
  const yearlyBudgetAmount = (yearlyBudgets ?? []).reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
  const savedAmount = period === "yearly" ? Math.max(0, yearlyBudgetAmount - totalExpenses) : Math.max(0, monthlyBudgetAmount - totalExpenses);
  const savingsPct = (period === "yearly" ? (yearlyBudgetAmount > 0 ? (savedAmount / yearlyBudgetAmount) * 100 : 0) : (monthlyBudgetAmount > 0 ? (savedAmount / monthlyBudgetAmount) * 100 : 0));

  // Chart data based on period
  const chartData = (() => {
    if (!expenses?.length) return [];
    if (period === "daily") {
      const map = new Map<string, number>();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const key = String(d);
        map.set(key, 0);
      }
      expenses.forEach((e) => {
        const date = new Date(e.expense_date);
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          const key = String(date.getDate());
          map.set(key, (map.get(key) ?? 0) + Number(e.amount));
        }
      });
      return Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
    }
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
          <h1 className="text-lg font-bold">Insight</h1>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2 glass-card p-1 rounded-xl">
          {(["daily", "monthly", "yearly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                period === p ? "gradient-accent text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Expenses</p>
          <p className="text-3xl font-bold tabular-nums mt-1">₹{totalExpenses.toLocaleString("en-IN")}</p>
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
                  formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Spent"]}
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
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => {
                const filename = `expenses-report-${period}-${now.getFullYear()}${period === 'monthly' ? `-${String(now.getMonth()+1).padStart(2,'0')}` : ''}.csv`;
                const headerLines = [`Report: Expenses (${period})`, `Generated: ${new Date().toLocaleString()}`];
                if (period === 'monthly') headerLines.push(`Budget: ₹${monthlyBudgetAmount}`);
                if (period === 'yearly') headerLines.push(`Yearly Budget Total: ₹${yearlyBudgetAmount}`);
                headerLines.push(`Total Spent: ₹${totalExpenses}`);
                headerLines.push(`Saved: ₹${savedAmount}`);
                headerLines.push(`Savings %: ${savingsPct.toFixed(2)}%`);
                headerLines.push("\n");

                const escapeCSV = (s: any) => {
                  if (s === null || s === undefined) return '""';
                  const str = String(s).replace(/"/g, '""');
                  return `"${str}"`;
                };

                const rows = ["Date,Description,Category,Amount"];
                filteredExpenses.forEach((e) => {
                  const date = new Date(e.expense_date).toLocaleDateString('en-IN');
                  const desc = e.description ?? "";
                  const cat = (e.categories as any)?.name ?? "Uncategorized";
                  const amt = Number(e.amount).toFixed(2);
                  rows.push(`${escapeCSV(date)},${escapeCSV(desc)},${escapeCSV(cat)},${amt}`);
                });

                const csv = headerLines.join("\n") + "\n" + rows.join("\n");
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="glass-card px-3 py-2 rounded-lg text-sm"
            >
              Export CSV
            </button>
            <button
              onClick={() => {
                const doc = new jsPDF('p', 'pt', 'a4');
                doc.setFontSize(14);
                doc.text(`Expenses Report (${period})`, 40, 40);
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
                if (period === 'monthly') doc.text(`Budget: ₹${monthlyBudgetAmount}`, 40, 74);
                if (period === 'yearly') doc.text(`Yearly Budget Total: ₹${yearlyBudgetAmount}`, 40, 74);
                doc.text(`Total Spent: ₹${totalExpenses}`, 40, 90);
                doc.text(`Saved: ₹${savedAmount} (${savingsPct.toFixed(2)}%)`, 40, 106);

                const head = [["Date", "Description", "Category", "Amount"]];
                const body = filteredExpenses.map((e) => {
                  const date = new Date(e.expense_date).toLocaleDateString('en-IN');
                  const desc = e.description ?? "";
                  const cat = (e.categories as any)?.name ?? "Uncategorized";
                  const amt = Number(e.amount).toFixed(2);
                  return [date, desc, cat, amt];
                });

                (autoTable as any)(doc, {
                  startY: 120,
                  head: head,
                  body: body,
                  styles: { fontSize: 9, cellPadding: 4 },
                  headStyles: { fillColor: [240, 240, 240], textColor: 20 },
                  columnStyles: { 3: { halign: 'right' } },
                  theme: 'grid',
                });

                const filename = `expenses-report-${period}-${now.getFullYear()}${period === 'monthly' ? `-${String(now.getMonth()+1).padStart(2,'0')}` : ''}.pdf`;
                doc.save(filename);
              }}
              className="glass-card px-3 py-2 rounded-lg text-sm"
            >
              Save as PDF
            </button>
          </div>
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
                      <span className="text-sm font-semibold tabular-nums">₹{cat.total.toLocaleString("en-IN")}</span>
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
      </div>
    </AppLayout>
  );
}
