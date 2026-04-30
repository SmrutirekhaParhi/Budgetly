import { Home, PlusCircle, BarChart3, CreditCard, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/add-expense", icon: PlusCircle, label: "Add" },
  { path: "/subscriptions", icon: CreditCard, label: "Subs" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card rounded-t-2xl border-t border-border/30 px-2 pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isAdd = item.path === "/add-expense";

          if (isAdd) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 -mt-5"
              >
                <div className="gradient-accent rounded-full p-3 shadow-lg shadow-accent/20">
                  <PlusCircle className="h-6 w-6 text-accent-foreground" />
                </div>
                <span className="text-[10px] font-medium text-gold">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
