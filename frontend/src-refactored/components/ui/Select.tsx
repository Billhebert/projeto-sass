import React, { useState, useRef, useEffect } from 'react';
import { tokens } from '@/styles/tokens';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  helperText,
  disabled = false,
  required = false,
  fullWidth = false,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const sizeStyles = {
    sm: {
      padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
      fontSize: tokens.typography.fontSize.sm,
    },
    md: {
      padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
      fontSize: tokens.typography.fontSize.base,
    },
    lg: {
      padding: `${tokens.spacing[4]} ${tokens.spacing[5]}`,
      fontSize: tokens.typography.fontSize.lg,
    },
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const containerStyle: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[1],
  };

  const labelStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: error ? tokens.colors.error[700] : tokens.colors.neutral[700],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const selectContainerStyle: React.CSSProperties = {
    position: 'relative',
  };

  const selectButtonStyle: React.CSSProperties = {
    width: '100%',
    ...sizeStyles[size],
    backgroundColor: disabled ? tokens.colors.neutral[50] : tokens.colors.neutral[0],
    border: `1px solid ${error ? tokens.colors.error[500] : tokens.colors.neutral[300]}`,
    borderRadius: tokens.borderRadius.md,
    color: value ? tokens.colors.neutral[900] : tokens.colors.neutral[500],
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: tokens.typography.fontFamily.sans,
    transition: `all ${tokens.transitions.fast}`,
    outline: 'none',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: tokens.spacing[1],
    backgroundColor: tokens.colors.neutral[0],
    border: `1px solid ${tokens.colors.neutral[300]}`,
    borderRadius: tokens.borderRadius.md,
    boxShadow: tokens.shadows.lg,
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: tokens.zIndex.dropdown,
    animation: 'dropdownIn 0.15s ease-out',
  };

  const optionStyle = (isSelected: boolean, isDisabled: boolean): React.CSSProperties => ({
    padding: sizeStyles[size].padding,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    backgroundColor: isSelected ? tokens.colors.primary[50] : 'transparent',
    color: isDisabled
      ? tokens.colors.neutral[400]
      : isSelected
      ? tokens.colors.primary[700]
      : tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: sizeStyles[size].fontSize,
    transition: `background-color ${tokens.transitions.fast}`,
  });

  const helperStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    color: error ? tokens.colors.error[600] : tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <>
      <style>
        {`
          @keyframes dropdownIn {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <div style={containerStyle}>
        {label && (
          <label style={labelStyle}>
            {label}
            {required && <span style={{ color: tokens.colors.error[500] }}> *</span>}
          </label>
        )}

        <div ref={selectRef} style={selectContainerStyle}>
          <div
            style={selectButtonStyle}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            role="button"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                !disabled && setIsOpen(!isOpen);
              }
            }}
            onMouseEnter={(e) => {
              if (!disabled && !error) {
                e.currentTarget.style.borderColor = tokens.colors.primary[500];
              }
            }}
            onMouseLeave={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = tokens.colors.neutral[300];
              }
            }}
            onFocus={(e) => {
              if (!disabled && !error) {
                e.currentTarget.style.borderColor = tokens.colors.primary[500];
                e.currentTarget.style.boxShadow = `0 0 0 3px ${tokens.colors.primary[100]}`;
              }
            }}
            onBlur={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = tokens.colors.neutral[300];
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <span>{displayValue}</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{
                transition: `transform ${tokens.transitions.fast}`,
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {isOpen && (
            <div style={dropdownStyle} role="listbox">
              {options.map((option) => (
                <div
                  key={option.value}
                  style={optionStyle(option.value === value, option.disabled || false)}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  onMouseEnter={(e) => {
                    if (!option.disabled) {
                      e.currentTarget.style.backgroundColor =
                        option.value === value
                          ? tokens.colors.primary[100]
                          : tokens.colors.neutral[50];
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      option.value === value ? tokens.colors.primary[50] : 'transparent';
                  }}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {(error || helperText) && <span style={helperStyle}>{error || helperText}</span>}
      </div>
    </>
  );
};
