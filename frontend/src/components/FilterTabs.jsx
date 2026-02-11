import PropTypes from "prop-types";
import "./FilterTabs.css";

/**
 * FilterTabs - Abas de filtro reutilizáveis
 * Substitui filter-tabs duplicadas em 10+ arquivos
 */
function FilterTabs({ 
  tabs, 
  activeTab, 
  onChange,
  variant = "default",
  className = "" 
}) {
  if (!tabs || tabs.length === 0) return null;
  
  const handleTabClick = (tabId) => {
    if (tabId !== activeTab) {
      onChange(tabId);
    }
  };
  
  const handleKeyPress = (e, tabId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTabClick(tabId);
    }
  };
  
  return (
    <div className={`filter-tabs filter-tabs-${variant} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        
        return (
          <button
            key={tab.id}
            className={`filter-tab ${isActive ? "active" : ""}`}
            onClick={() => handleTabClick(tab.id)}
            onKeyPress={(e) => handleKeyPress(e, tab.id)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
          >
            {tab.icon && (
              <span className="material-icons filter-tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            <span className="filter-tab-label">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className="filter-tab-badge" aria-label={`${tab.badge} itens`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

FilterTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string,
      badge: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(["default", "pills", "underline"]),
  className: PropTypes.string,
};

export default FilterTabs;
