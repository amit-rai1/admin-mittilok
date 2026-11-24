import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { CartInterestPage } from "./pages/CartInterestPage";
import { CategoriesPage } from "./pages/categories/CategoriesPage";
import { SubcategoriesPage } from "./pages/subcategories/SubcategoriesPage";
import { ProductsPage } from "./pages/products/ProductsPage";
import { ProductFormPage } from "./pages/products/ProductFormPage";
import { OrdersPage } from "./pages/orders/OrdersPage";
import { OrderDetailPage } from "./pages/orders/OrderDetailPage";
import { ReturnsPage } from "./pages/orders/ReturnsPage";
import { CustomersPage } from "./pages/customers/CustomersPage";
import { ContactsPage } from "./pages/ContactsPage";
import { ServicesPage } from "./pages/services/ServicesPage";
import { BookingsPage } from "./pages/services/BookingsPage";
import { EnquiriesPage } from "./pages/services/EnquiriesPage";
import { PodcastBookingsPage } from "./pages/podcast/PodcastBookingsPage";
import { FestivalCampaignsPage } from "./pages/festivals/FestivalCampaignsPage";
import { FestivalOptionsPage } from "./pages/festivals/FestivalOptionsPage";
import { FestivalBookingsPage } from "./pages/festivals/FestivalBookingsPage";
import { FestivalDemandPage } from "./pages/festivals/FestivalDemandPage";
import { CouponsPage } from "./pages/marketing/CouponsPage";
import { BannersPage } from "./pages/marketing/BannersPage";
import { HomepagePage } from "./pages/content/HomepagePage";
import { TeamPage } from "./pages/content/TeamPage";
import { ReviewsPage } from "./pages/reviews/ReviewsPage";
import { InventoryPage } from "./pages/inventory/InventoryPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { NotificationsPage } from "./pages/notifications/NotificationsPage";
import { PartnersPage } from "./pages/partners/PartnersPage";
import { PartnerNurseryPage } from "./pages/partners/PartnerNurseryPage";
import { isPartnerOnly } from "./lib/api";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot-screen">Checking session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function HomeRoute() {
  const { user } = useAuth();
  if (isPartnerOnly(user)) return <PartnerNurseryPage />;
  return <DashboardPage />;
}

function StaffOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (isPartnerOnly(user)) return <Navigate to="/" replace />;
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
        <Route index element={<HomeRoute />} />
        <Route path="partner/nursery" element={<PartnerNurseryPage />} />
        <Route path="partners" element={<StaffOnly><PartnersPage /></StaffOnly>} />
        <Route path="cart-interest/:vertical" element={<StaffOnly><CartInterestPage /></StaffOnly>} />
        <Route path="categories" element={<StaffOnly><CategoriesPage /></StaffOnly>} />
        <Route path="subcategories" element={<StaffOnly><SubcategoriesPage /></StaffOnly>} />
        <Route path="products" element={<StaffOnly><ProductsPage /></StaffOnly>} />
        <Route path="products/new" element={<StaffOnly><ProductFormPage /></StaffOnly>} />
        <Route path="products/:id" element={<StaffOnly><ProductFormPage /></StaffOnly>} />
        <Route path="orders" element={<StaffOnly><OrdersPage /></StaffOnly>} />
        <Route path="orders/returns" element={<StaffOnly><ReturnsPage /></StaffOnly>} />
        <Route path="orders/:id" element={<StaffOnly><OrderDetailPage /></StaffOnly>} />
        <Route path="customers" element={<StaffOnly><CustomersPage /></StaffOnly>} />
        <Route path="contacts" element={<StaffOnly><ContactsPage /></StaffOnly>} />
        <Route path="services" element={<StaffOnly><ServicesPage /></StaffOnly>} />
        <Route path="services/bookings" element={<StaffOnly><BookingsPage /></StaffOnly>} />
        <Route path="services/enquiries" element={<StaffOnly><EnquiriesPage /></StaffOnly>} />
        <Route path="podcast/bookings" element={<StaffOnly><PodcastBookingsPage /></StaffOnly>} />
        <Route path="festivals" element={<StaffOnly><FestivalCampaignsPage /></StaffOnly>} />
        <Route path="festivals/options" element={<StaffOnly><FestivalOptionsPage /></StaffOnly>} />
        <Route path="festivals/bookings" element={<StaffOnly><FestivalBookingsPage /></StaffOnly>} />
        <Route path="festivals/demand/:campaignId" element={<StaffOnly><FestivalDemandPage /></StaffOnly>} />
        <Route path="marketing/coupons" element={<StaffOnly><CouponsPage /></StaffOnly>} />
        <Route path="marketing/banners" element={<StaffOnly><BannersPage /></StaffOnly>} />
        <Route path="content/homepage" element={<StaffOnly><HomepagePage /></StaffOnly>} />
        <Route path="content/team" element={<StaffOnly><TeamPage /></StaffOnly>} />
        <Route path="reviews" element={<StaffOnly><ReviewsPage /></StaffOnly>} />
        <Route path="inventory" element={<StaffOnly><InventoryPage /></StaffOnly>} />
        <Route path="reports" element={<StaffOnly><ReportsPage /></StaffOnly>} />
        <Route path="settings" element={<StaffOnly><SettingsPage /></StaffOnly>} />
        <Route path="notifications" element={<StaffOnly><NotificationsPage /></StaffOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
