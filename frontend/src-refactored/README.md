# Vendata Frontend Refactored (v2.0)

This directory contains the **refactored frontend** of the Vendata application with modern architecture, TypeScript, and best practices.

## 🚀 Quick Start

### 1. Setup Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and add your Mercado Livre credentials:
```env
VITE_ML_CLIENT_ID=your_ml_client_id_here
VITE_ML_REDIRECT_URI=http://localhost:5173/auth/ml-callback
```

### 2. Update Vite Entry Point

**TEMPORARY**: To test the refactored app, you need to point Vite to the new entry point.

Edit `index.html` and change the script source:

```html
<!-- OLD -->
<script type="module" src="/src/main.jsx"></script>

<!-- NEW (for testing refactored app) -->
<script type="module" src="/src-refactored/main.tsx"></script>
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## ✅ What's Completed (Phase 1-4: ~40%)

### ✅ Infrastructure & Configuration
- TypeScript setup with path aliases
- Vite configuration with `@/` alias
- React Query configuration
- Global constants and config

### ✅ Design System
- Design tokens (colors, typography, spacing, etc.)
- Responsive breakpoints
- Animation/transition constants

### ✅ UI Components (Base)
- Button (with variants, sizes, loading states)
- Input (with labels, errors, icons)
- Card (with header, content, footer)
- Modal (with sizes, animations)
- Toast/Notification system (with provider)
- Spinner (loading indicator)
- Select/Dropdown (custom styled)

### ✅ Auth Feature (Complete!)
- **Services**: `AuthService` with all API calls
- **Store**: Zustand auth store with persistence
- **Hooks**: `useAuth`, `useLogin`, `useRegister`, `useLogout`
- **Components**: `LoginForm`, `RegisterForm`
- **Pages**: `LoginPage`, `RegisterPage`, `OAuthCallbackPage`
- **Routing**: Protected routes, auth flow

### ✅ API Layer
- Axios client with interceptors
- Request/response logging
- Error normalization
- Token management
- 401 handling

### ✅ TypeScript Types
- All API response types
- User, Auth, MLAccount types
- Generic wrappers (ApiResponse, PaginatedResponse)

---

## 📁 Project Structure

```
src-refactored/
├── components/
│   ├── ui/              # Primitive UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Spinner.tsx
│   │   ├── Select.tsx
│   │   └── index.ts
│   └── layout/          # Layout components
│       └── ProtectedRoute.tsx
│
├── features/            # Feature modules
│   └── auth/           # Authentication feature
│       ├── components/  # LoginForm, RegisterForm
│       ├── hooks/       # useAuth, useLogin, useRegister
│       ├── pages/       # LoginPage, RegisterPage, OAuthCallback
│       ├── services/    # AuthService (API calls)
│       └── store/       # Auth Zustand store
│
├── services/            # Global services
│   └── api-client.ts   # Axios instance with interceptors
│
├── types/              # TypeScript types
│   └── api.types.ts   # API response types
│
├── config/             # App configuration
│   ├── query-client.ts # React Query config
│   └── constants.ts    # App constants
│
├── styles/             # Global styles
│   ├── tokens.ts       # Design tokens
│   └── global.css      # CSS reset
│
├── App.tsx             # Main app with routing
└── main.tsx            # Entry point
```

---

## 🧪 Testing the Auth Flow

### Test Login
1. Navigate to `http://localhost:5173/login`
2. Enter credentials:
   - Email: `bill.hebert.choi@gmail.com`
   - Password: (your password)
3. Click "Sign In"
4. Should redirect to `/dashboard` on success
5. Should show error toast on failure

### Test Register
1. Navigate to `http://localhost:5173/register`
2. Fill in the registration form
3. Click "Create Account"
4. Should redirect to `/dashboard` on success

### Test Mercado Livre OAuth
1. On Login or Register page, click "Continue with Mercado Livre"
2. Should redirect to ML OAuth page
3. Authorize the app
4. Should redirect back to `/auth/ml-callback`
5. Should show success and redirect to `/dashboard`

### Test Protected Routes
1. Open browser in incognito mode
2. Navigate to `http://localhost:5173/dashboard`
3. Should redirect to `/login` automatically

---

## 🎨 Using UI Components

All UI components are exported from `@/components/ui`:

```tsx
import { Button, Input, Card, Modal, useToast } from '@/components/ui';

// Button
<Button variant="primary" size="md" loading={false}>
  Click me
</Button>

// Input
<Input
  label="Email"
  type="email"
  value={email}
  onChange={setEmail}
  error={error}
  placeholder="your@email.com"
/>

// Card
<Card variant="elevated">
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>

// Toast
const { showToast } = useToast();
showToast('Success!', 'success');
```

---

## 🔐 Using Auth Hooks

```tsx
import { useAuth, useLogin, useRegister, useLogout } from '@/features/auth/hooks';

// Access auth state
const { user, isAuthenticated, isLoading } = useAuth();

// Login
const { mutate: login, isPending } = useLogin();
login({ email, password }, {
  onSuccess: () => console.log('Logged in!'),
  onError: (error) => console.error(error)
});

// Register
const { mutate: register } = useRegister();
register({ name, email, password });

// Logout
const { mutate: logout } = useLogout();
logout();
```

---

## 🛠️ Path Aliases

TypeScript and Vite are configured with path aliases:

```tsx
// ✅ Good (using aliases)
import { Button } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { apiClient } from '@/services/api-client';
import { tokens } from '@/styles/tokens';

// ❌ Bad (relative imports)
import { Button } from '../../components/ui/Button';
```

---

## 📝 Next Steps (Priority Order)

### Phase 5: Dashboard Feature (NEXT)
- [ ] Create Dashboard layout
- [ ] Create Dashboard widgets (Stats, Charts)
- [ ] Create Dashboard service
- [ ] Create Dashboard hooks

### Phase 6: ML Accounts Feature
- [ ] Create MLAccountsList component
- [ ] Create MLAccountCard component
- [ ] Create ML accounts service
- [ ] Create ML accounts hooks
- [ ] Create ML accounts page

### Phase 7: Additional UI Components
- [ ] Table component
- [ ] Pagination component
- [ ] Tabs component
- [ ] Badge component
- [ ] Avatar component
- [ ] Tooltip component

### Phase 8: Items/Products Feature
- [ ] Items list page
- [ ] Item details page
- [ ] Items service & hooks
- [ ] Bulk edit functionality

### Phase 9: Orders Feature
- [ ] Orders list page
- [ ] Order details page
- [ ] Orders service & hooks
- [ ] Order status updates

### Phase 10: Performance Optimization
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Virtual lists for large data
- [ ] Memoization optimization

---

## 🐛 Known Issues / TODO

- [ ] Add proper error boundary
- [ ] Add 404 page
- [ ] Add forgot password page
- [ ] Add loading states to ProtectedRoute
- [ ] Add retry logic for failed API calls
- [ ] Add offline detection
- [ ] Add analytics tracking
- [ ] Add accessibility testing
- [ ] Add unit tests for components
- [ ] Add integration tests for auth flow

---

## 📚 Architecture Documentation

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🔄 Migration Plan

Once the refactored app is complete and tested:

1. **Switch Entry Point**: Update `index.html` to use `/src-refactored/main.tsx` permanently
2. **Archive Old Code**: Move `/src/` to `/src-old/` for reference
3. **Rename**: Rename `/src-refactored/` to `/src/`
4. **Update Scripts**: Update package.json scripts if needed
5. **Deploy**: Deploy to production

---

## 💡 Tips for Development

1. **Use Path Aliases**: Always use `@/` imports instead of relative paths
2. **Follow Feature Structure**: Keep related code together in feature folders
3. **Use TypeScript**: Leverage type safety - avoid `any` types
4. **Component Composition**: Build complex UIs from simple components
5. **React Query for Server State**: Use React Query for API calls, Zustand for UI state
6. **Accessibility**: Always add ARIA labels and keyboard navigation
7. **Error Handling**: Always handle errors gracefully with user feedback

---

## 📞 Need Help?

- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture details
- Look at existing components for patterns
- Check the auth feature for a complete reference implementation
- Read inline code comments for usage examples

---

**Status**: 🟢 Auth feature complete and ready for testing!
**Next**: Dashboard feature implementation
