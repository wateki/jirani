# 🏗️ Jirani Technical Architecture

**Document Version**: 1.0  
**Last Updated**: May 2025  
**Status**: Current  

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [Security Architecture](#security-architecture)
6. [Performance Architecture](#performance-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Integration Architecture](#integration-architecture)

---

## 🎯 System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  React SPA  │  PWA Service  │  Mobile Apps   │   Admin Panel    │
│  (Store UI) │    Worker     │   (Future)     │   (Dashboard)    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│           Vercel Edge Functions & CDN                          │
│         (Rate Limiting, CORS, Security Headers)                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Supabase API  │  Edge Functions │  Real-time    │  Storage     │
│  (CRUD, Auth)  │  (Business Logic)│  (WebSocket)  │  (Files)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL    │  Row Level     │  Vector DB     │  Backup &    │
│  (Primary DB)  │  Security      │  (Analytics)   │  Recovery    │
└─────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Multi-tenancy**: Complete data isolation per store using RLS
2. **Scalability**: Horizontal scaling with edge computing
3. **Security**: Zero-trust architecture with comprehensive validation
4. **Performance**: Global CDN with intelligent caching
5. **Reliability**: 99.9% uptime with automated failover

---

## 🏛️ Architecture Patterns

### 1. Multi-tenant SaaS Architecture

**Pattern**: Row Level Security (RLS) with Shared Database  
**Rationale**: Cost-effective scaling while maintaining data isolation

```sql
-- Example RLS Policy
CREATE POLICY "Users can only access their store data"
ON stores FOR ALL USING (
  auth.uid() = owner_id OR 
  auth.uid() IN (
    SELECT user_id FROM store_members 
    WHERE store_id = stores.id
  )
);
```

**Benefits**:
- ✅ Cost-effective for SMEs
- ✅ Simplified maintenance
- ✅ Database-level security
- ✅ Scalable to thousands of tenants

### 2. Component-Driven Architecture

**Pattern**: Modular components with strict size limits (≤500 LOC)  
**Rationale**: Maintainability and reusability

```typescript
// Example: Dashboard Component Architecture
/src/pages/dashboard/
├── Dashboard.tsx           // Main orchestrator (<350 LOC)
├── components/
│   ├── StatCard.tsx       // Reusable metric display
│   ├── OverviewCard.tsx   // Summary information
│   └── RecentOrders.tsx   // Order list component
├── hooks/
│   └── useDashboardData.ts // Data fetching logic
├── utils/
│   └── calculations.ts    // Business logic utilities
└── types/
    └── dashboard.types.ts // Shared type definitions
```

### 3. Real-time Data Architecture

**Pattern**: Supabase Real-time subscriptions with optimistic updates  
**Rationale**: Live collaboration and instant feedback

```typescript
// Real-time subscription example
const subscription = supabase
  .channel('orders')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'orders' },
    handleOrderUpdate
  )
  .subscribe();
```

### 4. Progressive Web App (PWA) Architecture

**Pattern**: Service worker with cache-first strategy  
**Rationale**: Offline capability for unreliable internet connections

```typescript
// Service Worker Strategy
const strategy = new CacheFirst({
  cacheName: 'app-cache-v1',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
    }),
  ],
});
```

---

## 🛠️ Technology Stack

### Frontend Stack

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **React** | 18.3.1 | UI Library | Mature ecosystem, concurrent features |
| **TypeScript** | 5.8.3 | Type Safety | Strict mode, enhanced DX |
| **Vite** | 5.4.1 | Build Tool | Fast HMR, optimized builds |
| **Tailwind CSS** | 3.4.11 | Styling | Utility-first, consistent design |
| **shadcn/ui** | Latest | Components | Accessible, customizable |
| **TanStack Query** | 5.56.2 | State Management | Server state, caching |
| **React Router** | 6.26.2 | Routing | Data loading, code splitting |

### Backend Stack

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Supabase** | Latest | Backend | Full-stack BaaS, PostgreSQL |
| **PostgreSQL** | 15+ | Database | ACID compliance, JSON support |
| **Row Level Security** | Native | Multi-tenancy | Database-level isolation |
| **Edge Functions** | Deno | Serverless | Low latency, global execution |
| **Supabase Storage** | Latest | File Storage | CDN, image optimization |

### Development Tools

| Tool | Version | Purpose | Configuration |
|------|---------|---------|---------------|
| **ESLint** | 9.27.0 | Linting | TypeScript, React rules |
| **Prettier** | 3.5.3 | Formatting | Tailwind class sorting |
| **Vitest** | 3.1.4 | Unit Testing | Fast, Vite-compatible |
| **Playwright** | 1.52.0 | E2E Testing | Cross-browser testing |
| **Husky** | 9.1.7 | Git Hooks | Pre-commit quality gates |

---

## 🗄️ Database Design

### Core Schema

```sql
-- Multi-tenant Store Architecture
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy for Stores
CREATE POLICY "store_access_policy" ON stores
FOR ALL USING (
    auth.uid() = owner_id OR
    auth.uid() IN (
        SELECT user_id FROM store_members 
        WHERE store_id = stores.id
    )
);

-- Products with Multi-tenant Isolation
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id),
    inventory_count INTEGER DEFAULT 0,
    images JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders with Status Tracking
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    status order_status DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    items JSONB NOT NULL,
    shipping_address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enum Types
CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'processing', 
    'shipped', 'delivered', 'cancelled'
);

CREATE TYPE payment_status AS ENUM (
    'pending', 'paid', 'failed', 'refunded'
);
```

### Analytics Schema

```sql
-- Business Intelligence Views
CREATE VIEW store_analytics AS
SELECT 
    s.id,
    s.name,
    COUNT(o.id) as total_orders,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_value,
    COUNT(DISTINCT o.customer_id) as unique_customers
FROM stores s
LEFT JOIN orders o ON s.id = o.store_id
WHERE o.status != 'cancelled'
GROUP BY s.id, s.name;

-- Customer Lifetime Value
CREATE VIEW customer_lifetime_value AS
SELECT 
    c.id,
    c.store_id,
    COUNT(o.id) as order_count,
    SUM(o.total_amount) as lifetime_value,
    AVG(o.total_amount) as avg_order_value,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.payment_status = 'paid'
GROUP BY c.id, c.store_id;
```

### Indexing Strategy

```sql
-- Performance Indexes
CREATE INDEX idx_stores_owner_id ON stores(owner_id);
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Composite Indexes for Analytics
CREATE INDEX idx_orders_store_status_date ON orders(store_id, status, created_at);
CREATE INDEX idx_products_store_category ON products(store_id, category_id);
```

---

## 🔐 Security Architecture

### Authentication & Authorization Flow

```
┌─────────────┐    JWT Token    ┌─────────────┐    RLS Check    ┌─────────────┐
│   Client    │ ─────────────── │  Supabase   │ ─────────────── │ PostgreSQL  │
│ Application │                 │    Auth     │                 │  Database   │
└─────────────┘                 └─────────────┘                 └─────────────┘
       │                               │                               │
       ▼                               ▼                               ▼
1. User Login              2. Generate JWT Token         3. Validate & Apply RLS
   with Email/Password        with User Claims              for Data Access
```

### Security Layers

#### 1. Network Security
- **HTTPS Everywhere**: TLS 1.3 encryption
- **Security Headers**: CSP, HSTS, X-Frame-Options
- **CORS Configuration**: Strict origin policies
- **Rate Limiting**: API endpoint protection

#### 2. Application Security
- **Input Validation**: Zod schemas on client and server
- **XSS Prevention**: Content Security Policy
- **CSRF Protection**: SameSite cookies
- **SQL Injection**: Parameterized queries only

#### 3. Data Security
- **Row Level Security**: Database-level multi-tenancy
- **Encryption at Rest**: AES-256 database encryption
- **Encryption in Transit**: TLS for all communications
- **Audit Logging**: Comprehensive access logging

#### 4. Authentication Security
- **JWT Tokens**: Short-lived access tokens
- **Refresh Tokens**: Secure token rotation
- **Session Management**: Automatic timeout
- **MFA Support**: Optional two-factor authentication

### Security Configuration

```typescript
// Content Security Policy
const cspConfig = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'", 'https://*.supabase.co'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
};

// Environment Configuration
const securityConfig = {
  JWT_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: '30m',
  SESSION_TIMEOUT: '24h',
};
```

---

## ⚡ Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                     CACHING LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│  Browser Cache  │  Service Worker  │  CDN Cache   │  Server Cache │
│  (Static Assets)│  (App Shell)     │  (Global)    │  (Database)   │
│  TTL: 1 year    │  TTL: 1 month    │  TTL: 1 hour │  TTL: 5 min   │
└─────────────────────────────────────────────────────────────────┘
```

#### Cache Configuration

```typescript
// TanStack Query Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Service Worker Cache Strategy
const strategies = {
  pages: new NetworkFirst({
    cacheName: 'pages-cache',
    networkTimeoutSeconds: 3,
  }),
  assets: new CacheFirst({
    cacheName: 'assets-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100 })],
  }),
  api: new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
  }),
};
```

### Performance Metrics

| Metric | Target | Current | Status |
|--------|---------|---------|--------|
| **Largest Contentful Paint (LCP)** | ≤ 1.5s | 1.2s | ✅ |
| **Interaction to Next Paint (INP)** | ≤ 100ms | 85ms | ✅ |
| **Cumulative Layout Shift (CLS)** | ≤ 0.05 | 0.02 | ✅ |
| **First Contentful Paint (FCP)** | ≤ 1.0s | 0.8s | ✅ |
| **Time to Interactive (TTI)** | ≤ 2.5s | 2.1s | ✅ |

### Code Splitting Strategy

```typescript
// Route-based Code Splitting
const Dashboard = lazy(() => import('../pages/Dashboard'));
const StoreCustomizer = lazy(() => import('../pages/StoreCustomizer'));
const LandingPage = lazy(() => import('../pages/LandingPage'));

// Component-based Code Splitting
const ChartComponent = lazy(() => import('../components/ChartComponent'));
const AdvancedAnalytics = lazy(() => import('../components/AdvancedAnalytics'));

// Bundle Analysis Configuration
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts'],
          utils: ['date-fns', 'clsx'],
        },
      },
    },
  },
});
```

---

## 🚀 Deployment Architecture

### Multi-Environment Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│ Feature Branch → Dev Deploy → Staging → Production              │
│      ↓              ↓           ↓          ↓                    │
│   PR Preview    Integration  User Testing  Blue-Green Deploy    │
└─────────────────────────────────────────────────────────────────┘
```

#### Environment Configuration

| Environment | Domain | Database | Purpose |
|-------------|--------|----------|---------|
| **Development** | `dev-jirani.vercel.app` | Dev DB | Feature development |
| **Staging** | `staging-jirani.vercel.app` | Staging DB | Integration testing |
| **Production** | `jirani.co` | Prod DB | Live application |

#### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - name: Quality Checks
        run: |
          npm run type-check
          npm run lint
          npm run test:run
          npm run test:e2e

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Security Audit
        run: |
          npm audit --audit-level high
          npm run security:scan

  deploy:
    needs: [quality-gates, security-scan]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### Infrastructure as Code

```typescript
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

---

## 🔌 Integration Architecture

### External Services Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Payment Gateways │  Email Services │  SMS Services │  Analytics │
│  (Stripe, M-Pesa) │  (SendGrid)     │  (Twilio)     │  (Vercel)  │
└─────────────────────────────────────────────────────────────────┘
```

#### Payment Integration Architecture

```typescript
// Payment Gateway Abstraction
interface PaymentProvider {
  processPayment(amount: number, currency: string): Promise<PaymentResult>;
  handleWebhook(payload: any): Promise<WebhookResult>;
  refundPayment(transactionId: string): Promise<RefundResult>;
}

class StripeProvider implements PaymentProvider {
  async processPayment(amount: number, currency: string) {
    // Stripe implementation
  }
}

class MPesaProvider implements PaymentProvider {
  async processPayment(amount: number, currency: string) {
    // M-Pesa implementation
  }
}

// Payment Service
class PaymentService {
  private providers = new Map<string, PaymentProvider>();

  getProvider(method: string): PaymentProvider {
    return this.providers.get(method) || this.providers.get('default');
  }
}
```

#### API Integration Patterns

```typescript
// Retry Configuration
const retryConfig = {
  retries: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  retryCondition: (error) => error.response?.status >= 500,
};

// Circuit Breaker Pattern
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

---

## 📊 Monitoring & Observability

### Application Monitoring

```typescript
// Performance Monitoring
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  analytics.track('performance', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
}

getCLS(sendToAnalytics);
getFCP(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Error Monitoring
window.addEventListener('error', (event) => {
  analytics.track('error', {
    message: event.error.message,
    stack: event.error.stack,
    filename: event.filename,
    lineno: event.lineno,
  });
});
```

### Business Metrics

```sql
-- Key Performance Indicators
CREATE VIEW business_metrics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as daily_orders,
    SUM(total_amount) as daily_revenue,
    COUNT(DISTINCT customer_id) as unique_customers,
    AVG(total_amount) as avg_order_value
FROM orders 
WHERE payment_status = 'paid'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🎯 Architecture Decision Records (ADRs)

### ADR-001: Multi-tenant Strategy
- **Decision**: Row Level Security (RLS) over separate databases
- **Rationale**: Cost efficiency, simplified maintenance, database-level security
- **Trade-offs**: Potential scaling limitations at massive scale
- **Status**: Accepted

### ADR-002: Frontend Framework
- **Decision**: React over Vue/Angular
- **Rationale**: Team expertise, ecosystem maturity, TypeScript support
- **Trade-offs**: Bundle size considerations
- **Status**: Accepted

### ADR-003: Backend Strategy
- **Decision**: Supabase over custom backend
- **Rationale**: Time to market, built-in features, PostgreSQL compatibility
- **Trade-offs**: Vendor lock-in considerations
- **Status**: Accepted

---

## 🔄 Future Architecture Considerations

### Scaling Strategies
- **Database Sharding**: When approaching 100K+ stores
- **Microservices Migration**: For independent service scaling
- **Global Distribution**: Multi-region deployment for latency
- **Event-Driven Architecture**: For complex business workflows

### Technology Evolution
- **Next.js Migration**: For advanced SSR capabilities
- **GraphQL Implementation**: For flexible data fetching
- **Kubernetes Deployment**: For container orchestration
- **AI/ML Integration**: For predictive analytics

---

*This document is maintained by the Jirani Engineering Team and updated quarterly or when significant architectural changes occur.*

**Last Review**: May 2025  
**Next Review**: March 2025  
**Version**: 1.0 