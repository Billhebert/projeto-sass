import PropTypes from "prop-types";
import { formatNumber } from "../utils/formatters";
import "./StatsCard.css";

/**
 * StatsCard - Card de estatística reutilizável
 * Substitui stat-card duplicado em 15+ arquivos
 */
function StatsCard({
  icon,
  label,
  value,
  variant = "blue",
  trend = null,
  subtitle = null,
  onClick = null,
  loading = false,
  className = "",
}) {
  const isClickable = typeof onClick === "function";
  
  const handleClick = () => {
    if (isClickable) {
      onClick();
    }
  };
  
  const handleKeyPress = (e) => {
    if (isClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };
  
  return (
    <div
      className={`stat-card stat-card-${variant} ${isClickable ? "stat-card-clickable" : ""} ${className}`}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {loading ? (
        <div className="stat-card-loading">
          <div className="spinner-small"></div>
        </div>
      ) : (
        <>
          <div className={`stat-icon stat-icon-${variant}`}>
            {typeof icon === "string" && icon.length <= 3 ? (
              <span className="stat-emoji" aria-hidden="true">{icon}</span>
            ) : (
              <span className="material-icons" aria-hidden="true">{icon}</span>
            )}
          </div>
          
          <div className="stat-content">
            <div className="stat-value">
              {typeof value === "number" ? formatNumber(value) : value}
            </div>
            <div className="stat-label">{label}</div>
            
            {subtitle && <div className="stat-subtitle">{subtitle}</div>}
            
            {trend && (
              <div className={`stat-trend ${trend.startsWith("+") ? "trend-up" : "trend-down"}`}>
                <span className="material-icons trend-icon">
                  {trend.startsWith("+") ? "trending_up" : "trending_down"}
                </span>
                {trend}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

StatsCard.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  variant: PropTypes.oneOf(["blue", "green", "red", "yellow", "purple", "gray"]),
  trend: PropTypes.string,
  subtitle: PropTypes.string,
  onClick: PropTypes.func,
  loading: PropTypes.bool,
  className: PropTypes.string,
};

export default StatsCard;
