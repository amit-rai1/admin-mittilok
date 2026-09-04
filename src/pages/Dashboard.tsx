import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, IndianRupee, MessageSquare, ShoppingBag, Users } from "lucide-react";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "../components/Layout";
import { api, formatMoney, type DashboardStats, type InventoryItem, type Order, ORDER_STATUS, statusClass } from "../lib/api";

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [dash, orderPage, inventory] = await Promise.all([
          api<DashboardStats>("/admin/dashboard"),
          api<{ items: Order[] }>("/admin/orders?page=1&pageSize=6"),
          api<{ items: InventoryItem[] }>("/admin/inventory?lowStockOnly=true&page=1&pageSize=6"),
        ]);
        if (cancelled) return;
        setStats(dash);
        setOrders(orderPage.items);
        setLowStock(inventory.items);
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
