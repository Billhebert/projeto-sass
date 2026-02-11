import PropTypes from "prop-types";
import "./PageHeader.css";

/**
 * PageHeader - Cabeçalho padrão de página reutilizável
 * Substitui page-header duplicado em 20+ arquivos
 */
function PageHeader({
  title,
  subtitle = null,
  icon = null,
  actions = null,
  breadcrumbs = null,
  className = "",
}) {
  return (
    <div className={`page-header ${className}`}>
      {breadcrumbs && (
        <nav className="page-breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs}
        </nav>
      )}
      
      <div className="page-header-main">
        <div className="page-header-content">
          <h1 className="page-title">
            {icon && (
              <span className="material-icons page-title-icon" aria-hidden="true">
                {icon}
              </span>
            )}
            {title}
          </h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        
        {actions && (
          <div className="page-header-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.string,
  actions: PropTypes.node,
  breadcrumbs: PropTypes.node,
  className: PropTypes.string,
};

export default PageHeader;
