import PropTypes from "prop-types";
import "./StatsGrid.css";

/**
 * StatsGrid - Container para cards de estatísticas
 * Layout responsivo e consistente
 */
function StatsGrid({ 
  children, 
  columns = "auto",
  gap = "normal",
  className = "" 
}) {
  const columnClass = columns === "auto" ? "" : `stats-grid-cols-${columns}`;
  const gapClass = `stats-grid-gap-${gap}`;
  
  return (
    <div className={`stats-grid ${columnClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}

StatsGrid.propTypes = {
  children: PropTypes.node.isRequired,
  columns: PropTypes.oneOf(["auto", "1", "2", "3", "4", "5", "6"]),
  gap: PropTypes.oneOf(["small", "normal", "large"]),
  className: PropTypes.string,
};

export default StatsGrid;
