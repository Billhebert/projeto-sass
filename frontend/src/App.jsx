import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Products from './pages/Products'
import AllProducts from './pages/AllProducts'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import OAuthCallback from './pages/OAuthCallback'
import Layout from './components/Layout'
import Toast from './components/Toast'

// New pages
import Orders from './pages/Orders'
import Questions from './pages/Questions'
import Shipments from './pages/Shipments'
import Messages from './pages/Messages'
import Promotions from './pages/Promotions'
import Claims from './pages/Claims'
import Notifications from './pages/Notifications'
import Items from './pages/Items'
import ItemCreate from './pages/ItemCreate'
import ItemEdit from './pages/ItemEdit'
import Metrics from './pages/Metrics'
import Invoices from './pages/Invoices'
import Billing from './pages/Billing'
import Moderations from './pages/Moderations'
import Reviews from './pages/Reviews'
import Inventory from './pages/Inventory'
import SalesDashboard from './pages/SalesDashboard'

// Premium pages
import Reputation from './pages/Reputation'
import Quality from './pages/Quality'
import Trends from './pages/Trends'
import Competitors from './pages/Competitors'
import Advertising from './pages/Advertising'

// New Premium pages
import Catalog from './pages/Catalog'
import Fulfillment from './pages/Fulfillment'
import ProfitCalculator from './pages/ProfitCalculator'
import PriceAutomation from './pages/PriceAutomation'
import GlobalSelling from './pages/GlobalSelling'
import FinancialReports from './pages/FinancialReports'
import Conciliation from './pages/Conciliation'

// Phase 6 - New List Pages
import ItemsList from './pages/ItemsList'
import OrdersList from './pages/OrdersList'
import ShippingList from './pages/ShippingList'
import QuestionsList from './pages/QuestionsList'
import FeedbackList from './pages/FeedbackList'
import CategoriesList from './pages/CategoriesList'

function App() {
  const { token, loadToken } = useAuthStore()

  useEffect(() => {
    loadToken()
  }, [loadToken])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toast />
      <Routes>
        {/* OAuth Callback - accessible without authentication */}
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {!token ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          <Route element={<Layout />}>
            {/* Main */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/:accountId/products" element={<Products />} />
            
            {/* Products - Global view */}
            <Route path="/products" element={<AllProducts />} />
            
            {/* Phase 6 - New List Pages (Enhanced versions) */}
            <Route path="/products-list" element={<ItemsList />} />
            <Route path="/orders-list" element={<OrdersList />} />
            <Route path="/shipping-list" element={<ShippingList />} />
            <Route path="/questions-list" element={<QuestionsList />} />
            <Route path="/feedback-list" element={<FeedbackList />} />
            <Route path="/categories" element={<CategoriesList />} />
            
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
            
            {/* Financial */}
            <Route path="/billing" element={<Billing />} />
            
            {/* System */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
