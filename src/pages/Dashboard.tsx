import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, IndianRupee, Leaf, MessageSquare, ShoppingBag, Sprout, Users } from "lucide-react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../components/Layout";
import {
  api,
  formatMoney,
  type CartVerticalAnalytics,
  type CartVerticalUser,
  type DashboardStats,
  type InventoryItem,
  type Order,
  ORDER_STATUS,
  statusClass,
} from "../lib/api";

function CartUserList({
  users,
  totalCount,
  empty,
}: {
  users: CartVerticalUser[];
  totalCount: number;
  empty: string;
}) {
  if (!users.length) return <EmptyState message={empty} />;
  return (
    <>
      <div className="stack-list">
        {users.map((user) => (
          <div className="stack-row" key={user.userId}>
            <div>
              <strong>{user.fullName || user.email || `User #${user.userId}`}</strong>
              <small>
                {[user.phone, user.email].filter(Boolean).join(" · ") || "No contact"}
                {user.sampleProducts?.length ? ` · ${user.sampleProducts.join(", ")}` : ""}
              </small>
            </div>
            <span>{user.itemCount} items</span>
          </div>
        ))}
      </div>
      {totalCount > users.length ? (
        <p className="muted" style={{ marginTop: 8 }}>
          Showing {users.length} of {totalCount}
        </p>
      ) : null}
    </>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cartInterest, setCartInterest] = useState<CartVerticalAnalytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [dash, orderPage, inventory, carts] = await Promise.all([
          api<DashboardStats>("/admin/dashboard"),
          api<{ items: Order[] }>("/admin/orders?page=1&pageSize=6"),
          api<{ items: InventoryItem[] }>("/admin/inventory?lowStockOnly=true&page=1&pageSize=6"),
          api<CartVerticalAnalytics>("/admin/dashboard/carts-by-vertical").catch(() => null),
        ]);
        if (cancelled) return;
        setStats(dash);
        setOrders(orderPage.items);
        setLowStock(inventory.items);
        setCartInterest(carts);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingState label="Loading dashboard…" />;

  const cards = stats
    ? [
        { label: "Orders", value: stats.totalOrders, hint: `${stats.pendingOrders} pending`, icon: ShoppingBag, tone: "mint" },
        { label: "Revenue today", value: formatMoney(stats.revenueToday), hint: `${formatMoney(stats.revenueMonth)} this month`, icon: IndianRupee, tone: "yellow" },
        { label: "Customers", value: stats.totalCustomers, hint: "Registered buyers", icon: Users, tone: "blue" },
        { label: "Needs attention", value: stats.lowStockProducts + stats.openEnquiries, hint: `${stats.lowStockProducts} low stock · ${stats.openEnquiries} enquiries`, icon: Boxes, tone: "coral" },
        ...(cartInterest
          ? [
              { label: "Nursery in cart", value: cartInterest.nurseryUserCount, hint: "Users with Nursery items", icon: Sprout, tone: "mint" as const },
              { label: "Organics in cart", value: cartInterest.organicsUserCount, hint: "Users with Organics items", icon: Leaf, tone: "yellow" as const },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live pulse of MittiLok operations." />
      <ErrorBanner message={error} />
      <section className="stat-grid">
        {cards.map(({ label, value, hint, icon: Icon, tone }) => (
          <article className="stat-card" key={label}>
            <div className={`stat-icon ${tone}`}>
              <Icon size={18} />
            </div>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Orders</p>
              <h3>Recent orders</h3>
            </div>
            <Link className="text-button" to="/orders">
              View all →
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState message="No orders yet." />
          ) : (
            <div className="stack-list">
              {orders.map((order) => (
                <Link className="stack-row" key={order.id} to={`/orders/${order.id}`}>
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <small>{new Date(order.createdAt).toLocaleDateString("en-IN")}</small>
                  </div>
                  <span>{formatMoney(order.grandTotal)}</span>
                  <span className={statusClass(ORDER_STATUS[order.orderStatus] ?? "Unknown")}>
                    {ORDER_STATUS[order.orderStatus] ?? order.orderStatus}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">Inventory</p>
              <h3>Low stock</h3>
            </div>
            <Link className="text-button" to="/inventory">
              Manage →
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState message="Stock levels look healthy." />
          ) : (
            <div className="stack-list">
              {lowStock.map((item) => (
                <div className="stack-row" key={item.id}>
                  <div>
                    <strong>{item.productName ?? item.sku}</strong>
                    <small>{item.sku}</small>
                  </div>
                  <span className="critical">{item.availableQuantity} left</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {cartInterest && (
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Cart interest</p>
                <h3>Nursery ({cartInterest.nurseryUserCount})</h3>
              </div>
              <Link className="text-button" to="/cart-interest/nursery">
                View all →
              </Link>
            </div>
            <CartUserList
              users={cartInterest.nurseryUsers}
              totalCount={cartInterest.nurseryUserCount}
              empty="No users with Nursery items in cart."
            />
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Cart interest</p>
                <h3>Organics ({cartInterest.organicsUserCount})</h3>
              </div>
              <Link className="text-button" to="/cart-interest/organics">
                View all →
              </Link>
            </div>
            <CartUserList
              users={cartInterest.organicsUsers}
              totalCount={cartInterest.organicsUserCount}
              empty="No users with Organics items in cart."
            />
          </section>
        </div>
      )}

      {stats && (
        <section className="panel activity">
          <div className="panel-heading">
            <div>
              <p className="kicker">Signals</p>
              <h3>Open work</h3>
            </div>
          </div>
          <div className="activity-list">
            <div>
              <span className="activity-icon mint">
                <MessageSquare size={16} />
              </span>
              <p>
                <strong>{stats.openEnquiries} open enquiries</strong>
                <small>Follow up from Services → Enquiries</small>
              </p>
              <Link to="/services/enquiries">Open</Link>
            </div>
            <div>
              <span className="activity-icon coral">
                <Boxes size={16} />
              </span>
              <p>
                <strong>{stats.lowStockProducts} low-stock SKUs</strong>
                <small>Adjust inventory before stockouts</small>
              </p>
              <Link to="/inventory">Review</Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
