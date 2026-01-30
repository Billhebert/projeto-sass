// src/components/stories/DataTable.stories.jsx

import DataTable from '../DataTable'

export default {
  title: 'Components/DataTable',
  component: DataTable,
  tags: ['autodocs'],
}

const sampleData = [
  {
    id: 1,
    name: 'Product A',
    price: 99.99,
    quantity: 50,
    status: 'Active',
    date: '2024-01-15',
  },
  {
    id: 2,
    name: 'Product B',
    price: 149.99,
    quantity: 30,
    status: 'Active',
    date: '2024-01-20',
  },
  {
    id: 3,
    name: 'Product C',
    price: 199.99,
    quantity: 0,
    status: 'Inactive',
    date: '2024-01-10',
  },
  {
    id: 4,
    name: 'Product D',
    price: 79.99,
    quantity: 100,
    status: 'Active',
    date: '2024-01-25',
  },
  {
    id: 5,
    name: 'Product E',
    price: 249.99,
    quantity: 15,
    status: 'Active',
    date: '2024-01-05',
  },
]

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Product Name', sortable: true },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'quantity', label: 'Quantity', sortable: true },
  { key: 'status', label: 'Status', sortable: false },
  { key: 'date', label: 'Date', sortable: true },
]

export const BasicTable = {
  args: {
    data: sampleData,
    columns: columns,
    onEdit: (item) => console.log('Edit:', item),
    onDelete: (item) => console.log('Delete:', item),
  },
}

export const WithPagination = {
  args: {
    data: sampleData,
    columns: columns,
    pagination: {
      currentPage: 1,
      totalPages: 3,
      pageSize: 5,
    },
    onPageChange: (page) => console.log('Page changed:', page),
    onEdit: (item) => console.log('Edit:', item),
    onDelete: (item) => console.log('Delete:', item),
  },
}

export const Sortable = {
  args: {
    data: sampleData,
    columns: columns,
    onSort: (column, direction) => console.log('Sort:', column, direction),
    onEdit: (item) => console.log('Edit:', item),
    onDelete: (item) => console.log('Delete:', item),
  },
}

export const Empty = {
  args: {
    data: [],
    columns: columns,
    onEdit: (item) => console.log('Edit:', item),
    onDelete: (item) => console.log('Delete:', item),
  },
}

export const Loading = {
  args: {
    data: [],
    columns: columns,
    loading: true,
    onEdit: (item) => console.log('Edit:', item),
    onDelete: (item) => console.log('Delete:', item),
  },
}
