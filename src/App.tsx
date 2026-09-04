import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { CategoriesPage } from "./pages/categories/CategoriesPage";
import { SubcategoriesPage } from "./pages/subcategories/SubcategoriesPage";
import { ProductsPage } from "./pages/products/ProductsPage";
import { ProductFormPage } from "./pages/products/ProductFormPage";
import { OrdersPage } from "./pages/orders/OrdersPage";
import { OrderDetailPage } from "./pages/orders/OrderDetailPage";
import { ReturnsPage } from "./pages/orders/ReturnsPage";
import { CustomersPage } from "./pages/customers/CustomersPage";
import { ServicesPage } from "./pages/services/ServicesPage";
import { BookingsPage } from "./pages/services/BookingsPage";
import { EnquiriesPage } from "./pages/services/EnquiriesPage";
import { PodcastBookingsPage } from "./pages/podcast/PodcastBookingsPage";
import { CouponsPage } from "./pages/marketing/CouponsPage";
import { BannersPage } from "./pages/marketing/BannersPage";
import { HomepagePage } from "./pages/content/HomepagePage";
import { ReviewsPage } from "./pages/reviews/ReviewsPage";
import { InventoryPage } from "./pages/inventory/InventoryPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { NotificationsPage } from "./pages/notifications/NotificationsPage";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot-screen">Checking session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="subcategories" element={<SubcategoriesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductFormPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/returns" element={<ReturnsPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/bookings" element={<BookingsPage />} />
        <Route path="services/enquiries" element={<EnquiriesPage />} />
        <Route path="podcast/bookings" element={<PodcastBookingsPage />} />
        <Route path="marketing/coupons" element={<CouponsPage />} />
        <Route path="marketing/banners" element={<BannersPage />} />
        <Route path="content/homepage" element={<HomepagePage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
