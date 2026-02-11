import React, { ReactNode } from 'react';
import { tokens } from '@/styles/tokens';
import { Spinner } from './Spinner';

export interface TableColumn<T = any> {
  key: string;
  title: string;
  render?: (value: any, record: T, index: number) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  rowKey?: string | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
  striped?: boolean;
  hoverable?: boolean;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyText = 'Nenhum dado disponível',
  rowKey = 'id',
  onRowClick,
  striped = false,
  hoverable = true,
}: TableProps<T>) {
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const theadStyle: React.CSSProperties = {
    backgroundColor: tokens.colors.neutral[50],
    borderBottom: `2px solid ${tokens.colors.neutral[200]}`,
  };

  const thStyle = (align?: 'left' | 'center' | 'right'): React.CSSProperties => ({
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    textAlign: align || 'left',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.neutral[700],
    whiteSpace: 'nowrap',
  });

  const tbodyStyle: React.CSSProperties = {};

  const trStyle = (index: number, clickable: boolean): React.CSSProperties => ({
    borderBottom: `1px solid ${tokens.colors.neutral[200]}`,
    backgroundColor: striped && index % 2 === 1 ? tokens.colors.neutral[25] : 'transparent',
    cursor: clickable ? 'pointer' : 'default',
    transition: `background-color ${tokens.transitions.fast}`,
  });

  const tdStyle = (align?: 'left' | 'center' | 'right'): React.CSSProperties => ({
    padding: `${tokens.spacing[4]} ${tokens.spacing[4]}`,
    textAlign: align || 'left',
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.neutral[900],
  });

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: tokens.spacing[12],
    color: tokens.colors.neutral[600],
  };

  const loadingContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing[12],
  };

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div style={emptyStateStyle}>{emptyText}</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead style={theadStyle}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  ...thStyle(column.align),
                  width: column.width,
                }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={tbodyStyle}>
          {data.map((record, index) => (
            <tr
              key={getRowKey(record, index)}
              style={trStyle(index, !!onRowClick)}
              onClick={() => onRowClick?.(record, index)}
              onMouseEnter={(e) => {
                if (hoverable) {
                  e.currentTarget.style.backgroundColor = tokens.colors.neutral[50];
                }
              }}
              onMouseLeave={(e) => {
                if (hoverable) {
                  e.currentTarget.style.backgroundColor =
                    striped && index % 2 === 1 ? tokens.colors.neutral[25] : 'transparent';
                }
              }}
            >
              {columns.map((column) => (
                <td key={column.key} style={tdStyle(column.align)}>
                  {column.render
                    ? column.render(record[column.key], record, index)
                    : record[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
