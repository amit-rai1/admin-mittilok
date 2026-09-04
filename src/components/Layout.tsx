import { useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  FolderTree,
  Image,
  LayoutDashboard,
  Leaf,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Mic2,
  Package,
  Settings,
  ShoppingBag,
  Ticket,
  Users,
  X,
  Home,
  Layers,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { to: "/categories", label: "Categories", icon: FolderTree },
      { to: "/subcategories", label: "Subcategories", icon: Layers },
      { to: "/products", label: "Products", icon: Package },
    ],
  },
  {
    label: "Mali Services",
    items: [
      { to: "/services", label: "Services", icon: Leaf },
      { to: "/services/bookings", label: "Bookings", icon: CalendarDays },
    ],
  },
  {
    label: "Landscaping",
    items: [{ to: "/services/enquiries", label: "Enquiries", icon: MessageSquare }],
  },
  {
    label: "Podcast",
    items: [{ to: "/podcast/bookings", label: "Bookings", icon: Mic2 }],
  },
  {
    label: "Orders",
    items: [
      { to: "/orders", label: "Orders", icon: ShoppingBag },
      { to: "/orders/returns", label: "Returns", icon: Package },
    ],
  },
  {
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/inventory", label: "Inventory", icon: Boxes },
      { to: "/marketing/coupons", label: "Coupons", icon: Ticket },
      { to: "/notifications", label: "Notifications", icon: Megaphone },
      { to: "/reports", label: "Reports", icon: BarChart3 },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/content/homepage", label: "Homepage", icon: Home },
      { to: "/marketing/banners", label: "Banners", icon: Image },
    ],
  },
];

const TITLE_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/categories": "Categories",
  "/subcategories": "Subcategories",
  "/products": "Products",
  "/products/new": "New product",
  "/inventory": "Inventory",
  "/orders": "Orders",
  "/orders/returns": "Returns",
  "/customers": "Customers",
  "/services": "Services",
  "/services/bookings": "Service bookings",
  "/services/enquiries": "Enquiries",
  "/podcast/bookings": "Podcast bookings",
  "/marketing/coupons": "Coupons",
  "/marketing/banners": "Banners",
  "/content/homepage": "Homepage",
  "/reviews": "Reviews",
  "/reports": "Reports",
  "/settings": "Settings",
  "/notifications": "Notifications",
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const title = useMemo(() => {
    if (location.pathname.startsWith("/products/") && location.pathname !== "/products/new") return "Edit product";
    if (location.pathname === "/orders/returns") return "Returns";
    if (location.pathname.startsWith("/orders/")) return "Order detail";
    return TITLE_MAP[location.pathname] ?? "Admin";
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand">
          <span>
            <Leaf size={18} />
          </span>
          <strong>MittiLok</strong>
          <button type="button" className="close-menu" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((group, index) => (
            <div key={group.label ?? `group-${index}`} className="nav-group">
              {group.label && <p className="nav-label">{group.label}</p>}
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/" || to === "/services" || to === "/orders"}
                  className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="nav-item" onClick={logout}>
            <LogOut size={16} />
            Sign out
          </button>
          <div className="admin-user">
            <div className="avatar">{(user?.name ?? "A").slice(0, 2).toUpperCase()}</div>
            <span>
              <strong>{user?.name ?? "Admin"}</strong>
              <small>{user?.roles[0] ?? "Administrator"}</small>
            </span>
          </div>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <button type="button" className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div>
            <p className="kicker">MittiLok operations</p>
            <h1>{title}</h1>
          </div>
          <div className="header-actions">
            <NotificationBell />
            <div className="header-avatar">{(user?.name ?? "A").slice(0, 2).toUpperCase()}</div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      {open && <button type="button" className="sidebar-backdrop" aria-label="Close" onClick={() => setOpen(false)} />}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-toolbar">
      <div>
        <p className="kicker">Admin</p>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty">{message}</div>;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <div className="loading-state">{label}</div>;
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return <div className="alert">{message}</div>;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount <= pageSize) return null;
  return (
    <div className="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
