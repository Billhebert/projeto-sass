# Frontend Integration Guide - Phase 6

## Quick Start: Adding New Pages to App.jsx

### 1. Import the New Components

Add these imports to `frontend/src/App.jsx`:

```javascript
import ItemsList from './pages/ItemsList'
import OrdersList from './pages/OrdersList'
import ShippingList from './pages/ShippingList'
import QuestionsList from './pages/QuestionsList'
import FeedbackList from './pages/FeedbackList'
import CategoriesList from './pages/CategoriesList'
```

### 2. Add Routes

Add these route definitions inside your `<Routes>` component:

```javascript
<Route path="/products" element={<ItemsList />} />
<Route path="/orders" element={<OrdersList />} />
<Route path="/shipping" element={<ShippingList />} />
<Route path="/questions" element={<QuestionsList />} />
<Route path="/feedback" element={<FeedbackList />} />
<Route path="/categories" element={<CategoriesList />} />
```

### 3. Update Sidebar Navigation

Add menu items to your Sidebar component:

```javascript
{
  label: 'Produtos',
  icon: '📦',
  path: '/products'
},
{
  label: 'Pedidos',
  icon: '📋',
  path: '/orders'
},
{
  label: 'Envios',
  icon: '🚚',
  path: '/shipping'
},
{
  label: 'Perguntas',
  icon: '❓',
  path: '/questions'
},
{
  label: 'Avaliações',
  icon: '⭐',
  path: '/feedback'
},
{
  label: 'Categorias',
  icon: '📂',
  path: '/categories'
}
```

---

## Component API Reference

### DataTable Component

```javascript
<DataTable
  data={items}
  columns={[
    { key: 'id', label: 'ID', width: '80px' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'price', label: 'Price', render: (val) => `$${val}` }
  ]}
  loading={false}
  error={null}
  pagination={{ limit: 20, offset: 0, total: 100 }}
  onPageChange={(offset) => {}}
  onSort={(column, dir) => {}}
  onEdit={(row) => {}}
  onDelete={(row) => {}}
  onRowClick={(row) => {}}
  selectable={true}
  striped={true}
  hoverable={true}
/>
```

### Form Component

```javascript
<Form
  title="New Item"
  fields={[
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Enter title...',
      validation: (value) => value.length >= 3 ? '' : 'Min 3 chars'
    }
  ]}
  initialValues={{ title: '' }}
  onSubmit={async (values) => {}}
  onCancel={() => {}}
  loading={false}
  error={null}
  submitLabel="Create"
/>
```

### Modal Component

```javascript
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Action"
  size="medium"
  closeOnEscape={true}
  closeOnBackdrop={true}
  footer={<button onClick={handleConfirm}>Confirm</button>}
>
  <p>Are you sure?</p>
</Modal>
```

### Filters Component

```javascript
<Filters
  filters={[
    { name: 'search', label: 'Search', type: 'text', placeholder: 'Type...' },
    { name: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]},
    { name: 'date_from', label: 'From', type: 'date' }
  ]}
  onApply={(filters) => {}}
  onReset={() => {}}
  loading={false}
/>
```

---

## API Service Usage

### Fetch Data

```javascript
import { itemsAPI, ordersAPI, shippingAPI } from '../services/api'

// Get items with pagination
const response = await itemsAPI.getItems({
  limit: 20,
  offset: 0,
  sort: 'created_desc'
})

// Create item
await itemsAPI.createItem({
  title: 'Product Name',
  category_id: 'MLB1234',
  price: 99.99,
  stock: 10,
  description: 'Description...'
})

// Update item
await itemsAPI.updateItem(itemId, {
  price: 89.99,
  stock: 5
})

// Delete item
await itemsAPI.deleteItem(itemId)

// Get orders
const orders = await ordersAPI.searchOrders({
  status: 'pending',
  limit: 20,
  offset: 0
})

// Get shipments
const shipments = await shippingAPI.listShipments({
  status: 'shipped'
})
```

### Error Handling

```javascript
import { handleAPIError } from '../services/api'

try {
  await itemsAPI.createItem(data)
} catch (error) {
  const { message, status, data } = handleAPIError(error)
  console.error(`Error ${status}: ${message}`)
  // Show toast with error
  setToast({
    type: 'error',
    message: message
  })
}
```

---

## Styling & Customization

### Available CSS Classes

All components use semantic CSS class names:

```
.data-table-container
.data-table, .data-table thead, .data-table tbody
.pagination
.form-container
.form-fields, .form-group
.form-label, .form-input
.error-message
.modal-backdrop, .modal, .modal-header, .modal-body, .modal-footer
.filters-container, .filters-body, .filters-actions
.toast-container, .toast, .toast-success, .toast-error
```

### Customizing Colors

Edit the color values in CSS files:
- Primary color: `#007bff` (blue)
- Success color: `#10b981` (green)
- Error color: `#ef4444` (red)
- Warning color: `#f59e0b` (amber)

---

## State Management

### Using Hooks

```javascript
const [items, setItems] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
const [pagination, setPagination] = useState({
  limit: 20,
  offset: 0,
  total: 0
})

const handlePageChange = (newOffset) => {
  setPagination(prev => ({
    ...prev,
    offset: newOffset
  }))
}
```

### Using Context (Optional)

For global state, use the existing stores:
- `authStore` - User authentication
- `appStore` - App-wide settings

---

## Common Patterns

### Fetch with Error Handling

```javascript
const fetchData = useCallback(async (offset = 0) => {
  try {
    setLoading(true)
    const response = await itemsAPI.getItems({
      limit: pagination.limit,
      offset: offset
    })
    setItems(response.data.data || [])
    setPagination(prev => ({
      ...prev,
      offset: offset,
      total: response.data.pagination?.total || 0
    }))
  } catch (err) {
    const apiError = handleAPIError(err)
    setError(apiError.message)
    setToast({
      type: 'error',
      message: apiError.message
    })
  } finally {
    setLoading(false)
  }
}, [pagination.limit])
```

### Create/Update with Modal

```javascript
const [showModal, setShowModal] = useState(false)
const [selectedItem, setSelectedItem] = useState(null)
const [isEditing, setIsEditing] = useState(false)

const handleCreate = () => {
  setSelectedItem(null)
  setIsEditing(false)
  setShowModal(true)
}

const handleEdit = (item) => {
  setSelectedItem(item)
  setIsEditing(true)
  setShowModal(true)
}

const handleSubmit = async (values) => {
  try {
    if (isEditing) {
      await itemsAPI.updateItem(selectedItem.id, values)
    } else {
      await itemsAPI.createItem(values)
    }
    setShowModal(false)
    fetchData()
  } catch (err) {
    // Handle error
  }
}
```

---

## Testing Quick Checklist

- [ ] All routes added to App.jsx
- [ ] Navigation links added to Sidebar
- [ ] API endpoints tested manually
- [ ] Error states work correctly
- [ ] Loading states show
- [ ] Pagination works
- [ ] Filters apply correctly
- [ ] CRUD operations work
- [ ] Responsive design verified
- [ ] Toast notifications appear
- [ ] Form validation works

---

## Troubleshooting

### API Not Responding
- Check backend is running: `npm start` in backend folder
- Verify API URL in `.env`: `VITE_API_URL=http://localhost:3011/api`
- Check browser console for CORS errors

### Components Not Rendering
- Verify import paths are correct
- Check Routes are inside `<BrowserRouter>`
- Ensure Layout component wraps pages

### Styling Issues
- Clear browser cache (Ctrl+Shift+Delete)
- Check CSS files are in same directory as JSX
- Verify class names match between JSX and CSS

### Data Not Loading
- Check API service functions exist
- Verify pagination parameters
- Log API response in console
- Check handleAPIError function

---

## Next Steps

1. Add all 6 routes to App.jsx
2. Test navigation
3. Test API connections
4. Implement cache layer
5. Add dashboard page
6. Write E2E tests
7. Deploy to production

---

*Reference: See pages for full implementation examples*
