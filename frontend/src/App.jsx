import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useEffect, lazy, Suspense } from "react";
import Layout from "./components/Layout";
import Toast from "./components/Toast";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoadingState from "./components/LoadingState";

// Eager load critical pages for better UX
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

// Lazy load all other pages for better performance
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));

// Products
const AllProducts = lazy(() => import("./pages/AllProducts"));
const Items = lazy(() => import("./pages/Items"));
const ItemCreate = lazy(() => import("./pages/ItemCreate"));
const ItemEdit = lazy(() => import("./pages/ItemEdit"));
const Catalog = lazy(() => import("./pages/Catalog"));
const Inventory = lazy(() => import("./pages/Inventory"));
const ProductCosts = lazy(() => import("./pages/ProductCosts"));

// Sales
const Orders = lazy(() => import("./pages/Orders"));
const SalesDashboard = lazy(() => import("./pages/SalesDashboard"));
const Shipments = lazy(() => import("./pages/Shipments"));
const Invoices = lazy(() => import("./pages/Invoices"));

// Support
const Questions = lazy(() => import("./pages/Questions"));
const Messages = lazy(() => import("./pages/Messages"));
const Claims = lazy(() => import("./pages/Claims"));
const Reviews = lazy(() => import("./pages/Reviews"));

// Marketing
const Promotions = lazy(() => import("./pages/Promotions"));
const Advertising = lazy(() => import("./pages/Advertising"));
const PriceAutomation = lazy(() => import("./pages/PriceAutomation"));
const Competitors = lazy(() => import("./pages/Competitors"));

// Analytics
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const Metrics = lazy(() => import("./pages/Metrics"));
const Reputation = lazy(() => import("./pages/Reputation"));
const Quality = lazy(() => import("./pages/Quality"));
const Trends = lazy(() => import("./pages/Trends"));

// Financial
const FinancialReports = lazy(() => import("./pages/FinancialReports"));
const Conciliation = lazy(() => import("./pages/Conciliation"));
const ProfitCalculator = lazy(() => import("./pages/ProfitCalculator"));
const Billing = lazy(() => import("./pages/Billing"));

// International
const GlobalSelling = lazy(() => import("./pages/GlobalSelling"));
const Fulfillment = lazy(() => import("./pages/Fulfillment"));

// Mercado Pago
const MPDashboard = lazy(() => import("./pages/MPDashboard"));
const MPPayments = lazy(() => import("./pages/MPPayments"));
const MPCheckout = lazy(() => import("./pages/MPCheckout"));
const MPSubscriptions = lazy(() => import("./pages/MPSubscriptions"));
const MPCustomers = lazy(() => import("./pages/MPCustomers"));
const MPCheckoutSuccess = lazy(() => import("./pages/MPCheckoutSuccess"));
const MPCheckoutFailure = lazy(() => import("./pages/MPCheckoutFailure"));
const MPCheckoutPending = lazy(() => import("./pages/MPCheckoutPending"));

// System
const MLAuth = lazy(() => import("./pages/MLAuth"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const Moderations = lazy(() => import("./pages/Moderations"));

function App() {
  const { token, loadToken } = useAuthStore();

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Toast />
      <Suspense fallback={<LoadingState />}>
        <Routes>
          {/* OAuth Callback - accessible without authentication */}
          <Route path="/auth/callback" element={<OAuthCallback />} />

          {/* Admin Panel - requires admin role */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute element={<Admin />} requiredRole="admin" />
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute element={<AdminUsers />} requiredRole="admin" />
            }
          />

          {!token ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : (
            <Route element={<Layout />}>
              {/* Main */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/ml-auth" element={<MLAuth />} />

              {/* Products - Global view */}
              <Route path="/products" element={<AllProducts />} />

              {/* Sales */}
              <Route path="/orders" element={<Orders />} />
              <Route path="/sales-dashboard" element={<SalesDashboard />} />
              <Route path="/shipments" element={<Shipments />} />
              <Route path="/invoices" element={<Invoices />} />

              {/* Support */}
              <Route path="/questions" element={<Questions />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/claims" element={<Claims />} />

              {/* Listings */}
              <Route path="/items" element={<Items />} />
              <Route path="/items/create" element={<ItemCreate />} />
              <Route path="/items/:itemId/edit" element={<ItemEdit />} />
              <Route path="/promotions" element={<Promotions />} />

              {/* Analytics */}
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/metrics" element={<Metrics />} />

              {/* Inventory & Quality */}
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/moderations" element={<Moderations />} />
              <Route path="/reviews" element={<Reviews />} />

              {/* Premium Features */}
              <Route path="/reputation" element={<Reputation />} />
              <Route path="/quality" element={<Quality />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/competitors" element={<Competitors />} />
              <Route path="/advertising" element={<Advertising />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/fulfillment" element={<Fulfillment />} />
              <Route path="/profit-calculator" element={<ProfitCalculator />} />
              <Route path="/price-automation" element={<PriceAutomation />} />
              <Route path="/global-selling" element={<GlobalSelling />} />
              <Route path="/financial-reports" element={<FinancialReports />} />
              <Route path="/conciliation" element={<Conciliation />} />
              <Route path="/product-costs" element={<ProductCosts />} />

              {/* Financial */}
              <Route path="/billing" element={<Billing />} />

              {/* Mercado Pago */}
              <Route path="/mp" element={<MPDashboard />} />
              <Route path="/mp/payments" element={<MPPayments />} />
              <Route path="/mp/checkout" element={<MPCheckout />} />
              <Route
                path="/mp/checkout/success"
                element={<MPCheckoutSuccess />}
              />
              <Route
                path="/mp/checkout/failure"
                element={<MPCheckoutFailure />}
              />
              <Route
                path="/mp/checkout/pending"
                element={<MPCheckoutPending />}
              />
              <Route path="/mp/subscriptions" element={<MPSubscriptions />} />
              <Route path="/mp/customers" element={<MPCustomers />} />

              {/* System */}
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />

              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          )}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
