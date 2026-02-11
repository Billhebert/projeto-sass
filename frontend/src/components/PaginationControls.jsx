import PropTypes from "prop-types";
import { formatCount } from "../utils/formatters";
import "./PaginationControls.css";

/**
 * PaginationControls - Controles de paginação reutilizáveis
 * Substitui controles duplicados em 8+ arquivos
 */
function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  onPrevPage,
  onNextPage,
  itemLabel = "item",
  itemLabelPlural = null,
  showPageNumbers = false,
  maxPageNumbers = 5,
  className = "",
}) {
  if (totalPages <= 1) return null;
  
  const handlePageClick = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };
  
  // Gera lista de números de página para mostrar
  const getPageNumbers = () => {
    const pages = [];
    const half = Math.floor(maxPageNumbers / 2);
    
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxPageNumbers - 1);
    
    // Ajusta start se end bateu no limite
    if (end - start < maxPageNumbers - 1) {
      start = Math.max(1, end - maxPageNumbers + 1);
    }
    
    // Adiciona primeira página e ellipsis
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }
    
    // Adiciona páginas do meio
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    // Adiciona ellipsis e última página
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const pageNumbers = showPageNumbers ? getPageNumbers() : [];
  const itemText = formatCount(totalItems, itemLabel, itemLabelPlural);
  
  return (
    <div className={`pagination-controls ${className}`}>
      {/* Previous button */}
      <button
        className="pagination-btn pagination-prev"
        onClick={onPrevPage}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <span className="material-icons">chevron_left</span>
        <span className="pagination-btn-text">Anterior</span>
      </button>
      
      {/* Page numbers (optional) */}
      {showPageNumbers && (
        <div className="pagination-numbers">
          {pageNumbers.map((page, index) => (
            page === "..." ? (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={page}
                className={`pagination-number ${page === currentPage ? "active" : ""}`}
                onClick={() => handlePageClick(page)}
                aria-label={`Página ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            )
          ))}
        </div>
      )}
      
      {/* Page info */}
      <div className="pagination-info">
        <span className="pagination-page-text">
          Página {currentPage} de {totalPages}
        </span>
        {totalItems > 0 && (
          <span className="pagination-total-text">
            ({itemText})
          </span>
        )}
      </div>
      
      {/* Next button */}
      <button
        className="pagination-btn pagination-next"
        onClick={onNextPage}
        disabled={currentPage === totalPages}
        aria-label="Próxima página"
      >
        <span className="pagination-btn-text">Próxima</span>
        <span className="material-icons">chevron_right</span>
      </button>
    </div>
  );
}

PaginationControls.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalItems: PropTypes.number,
  onPageChange: PropTypes.func.isRequired,
  onPrevPage: PropTypes.func.isRequired,
  onNextPage: PropTypes.func.isRequired,
  itemLabel: PropTypes.string,
  itemLabelPlural: PropTypes.string,
  showPageNumbers: PropTypes.bool,
  maxPageNumbers: PropTypes.number,
  className: PropTypes.string,
};

export default PaginationControls;
