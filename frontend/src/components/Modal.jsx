import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "./Modal.css";

/**
 * Reusable Modal component with accessibility improvements
 */
function Modal({
  isOpen = false,
  onClose = () => {},
  title = "",
  children,
  size = "medium",
  footer = null,
  className = "",
  closeOnEscape = true,
  closeOnBackdrop = true,
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement;

      // Add event listener
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      // Focus modal after a small delay
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "auto";

        // Restore focus to previous element
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, closeOnEscape, onClose]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return;

    const handleTab = (e) => {
      if (e.key !== "Tab") return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`modal modal-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar modal"
            type="button"
          >
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">{children}</div>

        {/* Modal Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.string,
  children: PropTypes.node,
  size: PropTypes.oneOf(["small", "medium", "large", "full"]),
  footer: PropTypes.node,
  className: PropTypes.string,
  closeOnEscape: PropTypes.bool,
  closeOnBackdrop: PropTypes.bool,
};

export default Modal;
