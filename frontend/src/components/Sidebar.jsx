import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useSidebarStore } from "../store/sidebarStore";
import "./Sidebar.css";

function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const {
    isCollapsed,
    isMobileOpen,
    toggleCollapse,
    toggleMobileMenu,
    closeMobileMenu,
  } = useSidebarStore();
  const [expandedSections, setExpandedSections] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        closeMobileMenu();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [closeMobileMenu]);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  // Menu sections definition - MUST be declared before filteredSections
  const menuSections = [
    {
      title: "Principal",
      items: [
        { path: "/", label: "Dashboard", icon: "dashboard" },
        { path: "/ml-auth", label: "Mercado Livre", icon: "store" },
      ],
    },

    {
      title: "Produtos",
      key: "products",
      items: [
        { path: "/products", label: "Todos os Produtos", icon: "inventory" },
        { path: "/inventory", label: "Estoque", icon: "warehouse" },
        { path: "/items", label: "Meus Anuncios", icon: "inventory_2" },
        { path: "/items/create", label: "Criar Anuncio", icon: "add_box" },
        { path: "/catalog", label: "Catalogo/Buy Box", icon: "library_books" },
        { path: "/fulfillment", label: "Mercado Full", icon: "local_shipping" },
      ],
    },
    {
      title: "Vendas",
      key: "sales",
      items: [
        { path: "/orders", label: "Pedidos", icon: "shopping_cart" },
        {
          path: "/sales-dashboard",
          label: "Dashboard Vendas",
          icon: "analytics",
        },
        { path: "/shipments", label: "Envios", icon: "local_shipping" },
        { path: "/invoices", label: "Notas Fiscais", icon: "receipt" },
        { path: "/billing", label: "Financeiro", icon: "account_balance" },
        {
          path: "/profit-calculator",
          label: "Calculadora Lucro",
          icon: "calculate",
        },
      ],
    },
    {
      title: "Atendimento",
      key: "support",
      items: [
        { path: "/questions", label: "Perguntas", icon: "help_outline" },
        { path: "/messages", label: "Mensagens", icon: "chat_bubble_outline" },
        { path: "/claims", label: "Reclamacoes", icon: "report_problem" },
        { path: "/reviews", label: "Avaliacoes", icon: "star_outline" },
      ],
    },
    {
      title: "Marketing",
      key: "marketing",
      items: [
        { path: "/promotions", label: "Promocoes", icon: "sell" },
        { path: "/advertising", label: "Product Ads", icon: "campaign" },
        {
          path: "/price-automation",
          label: "Automacao Precos",
          icon: "price_change",
        },
        { path: "/trends", label: "Tendencias", icon: "trending_up" },
        { path: "/competitors", label: "Concorrentes", icon: "groups" },
      ],
    },
    {
      title: "Analytics",
      key: "analytics",
      items: [
        { path: "/analytics", label: "Analises", icon: "trending_up" },
        { path: "/reports", label: "Relatorios", icon: "bar_chart" },
        {
          path: "/financial-reports",
          label: "Relatorios MP",
          icon: "account_balance",
        },
        { path: "/conciliation", label: "Conciliacao", icon: "compare_arrows" },
        {
          path: "/product-costs",
          label: "Custos (COGS)",
          icon: "attach_money",
        },
        { path: "/metrics", label: "Metricas", icon: "analytics" },
        { path: "/reputation", label: "Reputacao", icon: "verified" },
        { path: "/quality", label: "Qualidade", icon: "grade" },
        { path: "/moderations", label: "Moderacoes", icon: "gavel" },
      ],
    },
    {
      title: "Internacional",
      key: "international",
      items: [
        { path: "/global-selling", label: "Global Selling", icon: "public" },
      ],
    },
    {
      title: "Mercado Pago",
      key: "mercadopago",
      items: [
        { path: "/mp", label: "Dashboard MP", icon: "account_balance_wallet" },
        { path: "/mp/payments", label: "Pagamentos", icon: "payments" },
        {
          path: "/mp/checkout",
          label: "Criar Checkout",
          icon: "shopping_cart_checkout",
        },
        { path: "/mp/subscriptions", label: "Assinaturas", icon: "autorenew" },
        { path: "/mp/customers", label: "Clientes MP", icon: "people" },
      ],
    },
    {
      title: "Sistema",
      key: "system",
      items: [
        {
          path: "/notifications",
          label: "Notificacoes",
          icon: "notifications_none",
        },
        { path: "/settings", label: "Configuracoes", icon: "settings" },
        {
          path: "/admin/users",
          label: "Admin Usuarios",
          icon: "people",
          roles: ["admin"],
        },
      ],
    },
  ];

  // Filter menu items based on user role
  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles) return true;
        return item.roles.includes(user?.role);
      }),
    }))
    .filter((section) => section.items.length > 0);

  const isActive = (path) => location.pathname === path;
  const isInSection = (paths) =>
    paths.some((p) => location.pathname.startsWith(p));

  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: prev[section] === false ? true : false,
    }));
  }, []);

  const handleLogout = () => {
    logout();
  };

  // Render nav item
  const renderNavItem = (item) => (
    <Link
      key={item.path}
      to={item.path}
      className={`nav-item ${isActive(item.path) ? "active" : ""}`}
      title={isCollapsed ? item.label : ""}
      onClick={closeMobileMenu}
    >
      <span className="material-icons nav-icon">{item.icon}</span>
      <span className="nav-label">{item.label}</span>
    </Link>
  );

  // Render section
  const renderSection = (section, index) => {
    const isSectionExpanded =
      !section.key ||
      expandedSections[section.key] !== false ||
      isInSection(section.items.map((i) => i.path));

    // When collapsed: show only first item of each section
    // When expanded: show all items based on section expand state
    const itemsToShow = isCollapsed ? [section.items[0]] : section.items;
    const showItems = isCollapsed ? true : isSectionExpanded;

    return (
      <div key={index} className="nav-section">
        {section.key && !isCollapsed ? (
          <button
            className={`nav-section-header ${isSectionExpanded ? "expanded" : ""}`}
            onClick={() => toggleSection(section.key)}
          >
            <span className="nav-section-title">{section.title}</span>
            <span className="material-icons nav-section-arrow">
              {isSectionExpanded ? "expand_less" : "expand_more"}
            </span>
          </button>
        ) : !isCollapsed ? (
          <span className="nav-section-title static">{section.title}</span>
        ) : null}

        <div className={`nav-section-items ${!showItems ? "collapsed" : ""}`}>
          {itemsToShow.map(renderNavItem)}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={toggleMobileMenu}
          aria-label="Menu"
        >
          <span className="material-icons">
            {isMobileOpen ? "close" : "menu"}
          </span>
        </button>
        <Link to="/" className="mobile-logo">
          <span className="logo-icon">V</span>
          <span className="logo-text">VENDATA</span>
        </Link>
        <div className="mobile-header-actions">
          <Link to="/notifications" className="mobile-action-btn">
            <span className="material-icons">notifications_none</span>
          </Link>
          <div className="mobile-avatar" onClick={toggleMobileMenu}>
            {user?.firstName?.charAt(0) || "U"}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <span className="logo-icon">V</span>
            <span className="logo-text">VENDATA</span>
          </Link>
          {!isMobile && (
            <button
              className="collapse-btn"
              onClick={toggleCollapse}
              aria-label="Colapsar menu"
            >
              <span className="material-icons">
                {isCollapsed ? "chevron_right" : "chevron_left"}
              </span>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">{filteredSections.map(renderSection)}</nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.firstName?.charAt(0) || "U"}
            </div>
            <div className="user-details">
              <p className="user-name">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sair">
            <span className="material-icons">logout</span>
            <span className="logout-text">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </>
  );
}

export default Sidebar;
