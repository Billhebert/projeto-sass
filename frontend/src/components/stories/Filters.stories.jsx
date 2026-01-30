// src/components/stories/Filters.stories.jsx

import Filters from '../Filters'

export default {
  title: 'Components/Filters',
  component: Filters,
  tags: ['autodocs'],
}

const filterConfig = [
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'pending', label: 'Pending' },
    ],
  },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'electronics', label: 'Electronics' },
      { value: 'clothing', label: 'Clothing' },
      { value: 'books', label: 'Books' },
    ],
  },
  {
    name: 'priceRange',
    label: 'Price Range',
    type: 'text',
    placeholder: 'e.g., 0-100',
  },
]

export const BasicFilters = {
  args: {
    filters: filterConfig,
    onApply: (filters) => console.log('Filters applied:', filters),
    onReset: () => console.log('Filters reset'),
  },
}

export const WithInitialValues = {
  args: {
    filters: filterConfig,
    initialValues: {
      status: 'active',
      category: 'electronics',
    },
    onApply: (filters) => console.log('Filters applied:', filters),
    onReset: () => console.log('Filters reset'),
  },
}

export const Expandable = {
  args: {
    filters: filterConfig,
    expandable: true,
    onApply: (filters) => console.log('Filters applied:', filters),
    onReset: () => console.log('Filters reset'),
  },
}

export const CompactMode = {
  args: {
    filters: filterConfig,
    compact: true,
    onApply: (filters) => console.log('Filters applied:', filters),
    onReset: () => console.log('Filters reset'),
  },
}
