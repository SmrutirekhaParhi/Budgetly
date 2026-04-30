import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";
import { ArrowLeft, Check, Delete, Plus, ShoppingCart, Shirt, Monitor, Wallet, Heart, Home, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  user_id: string;
}

const DEFAULT_CATEGORIES = [
  { name: "Groceries", icon: "ShoppingCart", color: "#4CAF50" },
  { name: "Apparels", icon: "Shirt", color: "#9C27B0" },
  { name: "Electronics", icon: "Monitor", color: "#FF9800" },
  { name: "Investments", icon: "Wallet", color: "#FF9800" },
  { name: "Life", icon: "Heart", color: "#E91E63" },
  { name: "Rent", icon: "Home", color: "#2196F3" },
];

const ICON_MAP: Record<string, any> = {
  ShoppingCart,
  Shirt,
  Monitor,
  Wallet,
  Heart,
  Home,
};

export default function AddExpense() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("ShoppingCart");
  const [newCategoryColor, setNewCategoryColor] = useState("#4CAF50");
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const { data: categories } = useQuery({
    queryKey: ["categories", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user!.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  // Combine default and custom categories
  const allCategories: Category[] = categories || [];

  const handleKey = (key: string) => {
    if (key === "del") {
      setAmount((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
    } else if (key === ".") {
      if (!amount.includes(".")) setAmount((prev) => prev + ".");
    } else {
      setAmount((prev) => (prev === "0" ? key : prev + key));
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Enter category name");
      return;
    }

    try {
      const { error } = await supabase.from("categories").insert({
        user_id: user!.id,
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        color: newCategoryColor,
      });

      if (error) {
        toast.error(error.message || "Failed to add category");
        return;
      }

      toast.success("Category added!");
      setNewCategoryName("");
      setNewCategoryIcon("ShoppingCart");
      setNewCategoryColor("#4CAF50");
      setShowCategoryForm(false);
      // Refetch categories to update dropdown
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["categories", user?.id] });
      }, 100);
    } catch (err) {
      console.error("Error adding category:", err);
      toast.error("Failed to add category");
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!categoryId) {
      toast.error("Select a category");
      return;
    }

    setSaving(true);
    
    try {
      const expenseData = {
        user_id: user!.id,
        amount: numAmount,
        category_id: categoryId,
        description: description || null,
        expense_date: expenseDate,
        type: transactionType,
      };

      const { error } = await supabase.from("expenses").insert(expenseData);

      if (error) {
        toast.error(error.message || "Failed to add transaction");
        setSaving(false);
        return;
      }

      toast.success(`${transactionType} added!`);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setAmount("0");
      setDescription("");
      setCategoryId(null);
      setExpenseDate(new Date().toISOString().split("T")[0]);
      navigate("/dashboard");
    } catch (err) {
      console.error("Error adding transaction:", err);
      toast.error("Failed to add transaction");
      setSaving(false);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const displayDate = new Date(expenseDate);
  const dateStr = displayDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-1.5 glass-card rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold">Add Transaction</h1>
          <div className="w-10" />
        </div>

        {/* INCOME/EXPENSE Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setTransactionType("INCOME")}
            className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-xs uppercase tracking-wider transition-all ${
              transactionType === "INCOME"
                ? "gradient-accent text-accent-foreground shadow-lg shadow-accent/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setTransactionType("EXPENSE")}
            className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-xs uppercase tracking-wider transition-all ${
              transactionType === "EXPENSE"
                ? "gradient-accent text-accent-foreground shadow-lg shadow-accent/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expense
          </button>
        </div>

        {/* Transaction Details */}
        <div className="glass-card p-4 rounded-2xl space-y-2 text-sm">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Transaction</div>
          <div className="text-foreground flex items-center gap-3">
            <span className="font-semibold">{timeStr}</span>
            <span className="text-muted-foreground">|</span>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="px-3 py-2 bg-muted rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Amount Display */}
        <div className="text-center py-6 glass-card rounded-2xl">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">Amount</p>
          <p className="text-6xl font-bold tabular-nums text-foreground">
            ₹ {amount}
          </p>
        </div>

        {/* Description */}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add description (optional)"
          className="w-full glass-card px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        />

        {/* Categories */}
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</p>
            <button
              onClick={() => {
                setShowCategoryForm(!showCategoryForm);
                setShowCategoryDropdown(false);
              }}
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>

          {/* Add Category Form */}
          {showCategoryForm && (
            <div className="glass-card p-4 rounded-xl mb-3 space-y-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="w-full px-3 py-2 rounded-lg bg-muted text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-muted text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {Object.keys(ICON_MAP).map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-12 h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCategory}
                  className="flex-1 gradient-accent text-accent-foreground font-semibold py-2 rounded-lg text-sm transition-all active:scale-95"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCategoryForm(false)}
                  className="flex-1 glass-card text-foreground font-semibold py-2 rounded-lg text-sm transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Category Dropdown Button */}
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="w-full glass-card px-4 py-3 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow flex items-center justify-between group hover:bg-accent/5"
          >
            <div className="flex items-center gap-3">
              {categoryId ? (
                <>
                  {(() => {
                    const selected = allCategories.find((c) => c.id === categoryId);
                    if (!selected) return "Select a category";
                    const IconComponent = ICON_MAP[selected.icon];
                    return (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: selected.color + "33", color: selected.color }}
                        >
                          {IconComponent ? (
                            <IconComponent className="h-4 w-4" />
                          ) : (
                            <span className="text-xs font-bold">{selected.name[0]}</span>
                          )}
                        </div>
                        <span>{selected.name}</span>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <span className="text-muted-foreground">-- Select a category --</span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
          </button>

          {/* Category Dropdown Menu */}
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto shadow-lg">
              {allCategories.map((cat) => {
                const IconComponent = ICON_MAP[cat.icon];
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategoryId(cat.id);
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      categoryId === cat.id
                        ? "bg-accent/20 text-foreground"
                        : "text-foreground/80 hover:bg-accent/10"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat.color + "33", color: cat.color }}
                    >
                      {IconComponent ? (
                        <IconComponent className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">{cat.name[0]}</span>
                      )}
                    </div>
                    <span className="flex-1 text-left">{cat.name}</span>
                    {categoryId === cat.id && <Check className="h-4 w-4 text-accent" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2">
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={`py-3 rounded-xl font-semibold text-lg transition-all active:scale-95 ${
                key === "del"
                  ? "glass-card text-destructive hover:bg-destructive/10"
                  : "gradient-accent text-accent-foreground shadow-lg shadow-accent/20"
              }`}
            >
              {key === "del" ? <Delete className="h-5 w-5 mx-auto" /> : key}
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || !categoryId}
          className="w-full gradient-accent text-accent-foreground font-semibold py-3.5 rounded-xl active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
        >
          <Check className="h-5 w-5" />
          {saving ? "Saving..." : `Add ${transactionType}`}
        </button>
      </div>
    </AppLayout>
  );
}
