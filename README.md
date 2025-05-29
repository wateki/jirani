# 🏪 Jirani - Multi-tenant E-commerce Platform

**A comprehensive SaaS platform empowering Small and Medium Enterprises (SMEs) to build and manage their digital storefronts with enterprise-grade features.**

[![Production Ready](https://img.shields.io/badge/Production_Ready-80%25-green.svg)](./docs/audits/PRODUCTION_AUDIT.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black.svg)](https://vercel.com/)

---

## 🎯 Project Overview

Jirani is a **multi-tenant e-commerce platform** specifically designed for SMEs in emerging markets. It provides a complete solution for businesses to create online storefronts, manage inventory, process orders, and gain valuable insights through analytics.

### 🏷️ Target Businesses
- **Coffee Roasters & Cafes** (Farm-to-table operations)
- **Juice Bars & Smoothie Shops** (Health-focused beverages)
- **Convenience Stores** (Local retail operations)
- **Food Vendors** (Street food, catering, restaurants)
- **Grocery Vendors** (Local produce, specialty foods)
- **Artisan Shops** (Handmade goods, crafts, local products)

---

## ✨ Key Features

### 🏪 **Store Management**
- **Custom Branding**: Personalized logos, colors, and themes
- **Product Catalog**: Rich product listings with media support
- **Multi-outlet Support**: Manage multiple store locations
- **Real-time Inventory**: Live stock tracking and low-stock alerts

### 🛒 **E-commerce Core**
- **Secure Checkout**: Multi-payment gateway support
- **Order Management**: Streamlined fulfillment workflows
- **Customer Accounts**: Multi-tenant customer management
- **Mobile-optimized**: Responsive design for all devices

### 📊 **Analytics & Insights**
- **Sales Dashboards**: Revenue, conversion rates, order metrics
- **Customer Analytics**: Behavior patterns, lifetime value, retention
- **Product Performance**: Best sellers, trends, profitability analysis
- **Real-time Updates**: Live order and inventory notifications

### 🔐 **Enterprise Security**
- **Multi-tenant Architecture**: Secure data isolation per store
- **Row Level Security (RLS)**: Database-level access control
- **WCAG 2.2 AA Compliance**: Full accessibility support
- **PWA Capabilities**: Offline functionality and app-like experience

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher ([Install with nvm](https://github.com/nvm-sh/nvm))
- **npm** or **yarn** package manager
- **Supabase** account ([Sign up here](https://supabase.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/jirani.git
   cd jirani
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Configure your Supabase credentials
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   ```bash
   # Apply database migrations
   npx supabase migration up
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5174`

---

## 🏗️ Tech Stack

### **Frontend**
- **[React 18.3.1](https://reactjs.org/)** - Modern UI library with concurrent features
- **[TypeScript 5.8.3](https://www.typescriptlang.org/)** - Type-safe JavaScript with strict mode
- **[Vite 5.4.1](https://vitejs.dev/)** - Fast build tool and development server
- **[Tailwind CSS 3.4.11](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Accessible component library

### **Backend & Services**
- **[Supabase](https://supabase.com/)** - PostgreSQL database, auth, real-time, storage
- **[Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)** - Multi-tenant data isolation
- **[Vercel](https://vercel.com/)** - Edge deployment and analytics

### **State Management & Data**
- **[TanStack Query 5.56.2](https://tanstack.com/query)** - Server state management
- **[React Hook Form 7.53.0](https://react-hook-form.com/)** - Form handling
- **[Zod 3.23.8](https://zod.dev/)** - Schema validation

### **Development & Quality**
- **[Vitest 3.1.4](https://vitest.dev/)** - Unit testing framework
- **[Playwright 1.52.0](https://playwright.dev/)** - E2E testing
- **[ESLint 9.27.0](https://eslint.org/)** - Code linting
- **[Prettier 3.5.3](https://prettier.io/)** - Code formatting

---

## 📁 Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui base components
│   │   ├── common/         # Shared application components
│   │   └── features/       # Feature-specific components
│   ├── pages/              # Route page components
│   ├── layouts/            # Layout wrapper components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # External library configurations
│   ├── utils/              # Pure utility functions
│   ├── types/              # TypeScript type definitions
│   ├── contexts/           # React context providers
│   ├── integrations/       # External service integrations
│   └── config/             # Application configuration
├── docs/                   # Project documentation
│   ├── architecture/       # Technical architecture docs
│   ├── guides/            # Development and user guides
│   ├── audits/            # Quality audit reports
│   └── design/            # UX/UI design documentation
├── supabase/              # Database migrations and config
│   ├── migrations/        # SQL migration files
│   └── seed.sql          # Sample data
└── public/                # Static assets
```

---

## 🧪 Development Workflow

### **Quality Assurance**
```bash
# Run all quality checks
npm run quality

# Individual commands
npm run type-check      # TypeScript validation
npm run lint           # ESLint checking
npm run format:check   # Prettier formatting check
```

### **Testing**
```bash
# Unit tests
npm run test           # Run with watch mode
npm run test:run       # Single run
npm run test:coverage  # With coverage report

# E2E tests
npm run test:e2e       # Headless mode
npm run test:e2e:ui    # Interactive UI mode
```

### **Build & Deployment**
```bash
# Development build
npm run build:dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## 📊 Production Readiness

### **Current Status: 80% Production Ready** 🟢

#### **✅ Completed**
- Multi-tenant architecture with RLS security
- Modern React + TypeScript foundation
- PWA capabilities and service worker
- Security headers and CSP implementation
- Component-based architecture (modular design)
- Comprehensive error handling
- Performance optimization setup

#### **🔄 In Progress**
- Database schema standardization
- Component refactoring (2 large components remaining)
- Comprehensive testing implementation
- Payment gateway integration

#### **📋 Planned**
- Advanced analytics and BI features
- UX/conversion optimization
- African market localization
- Security audit and penetration testing

*See [Production Audit](./docs/audits/PRODUCTION_AUDIT.md) for detailed analysis*

---

## 🌍 Localization & African Markets

### **Supported Regions**
- **East Africa**: Kenya (KES), Uganda (UGX), Tanzania (TZS)
- **West Africa**: Ghana (GHS), Nigeria (NGN)
- **Languages**: English, Swahili, French, Portuguese (planned)

### **Local Payment Methods**
- **Mobile Money**: M-Pesa, Airtel Money, MTN Mobile Money
- **Bank Transfers**: Local banking integration
- **Digital Wallets**: Flutterwave, Paystack integration

---

## 📚 Documentation

### **Technical Documentation**
- [🏗️ Architecture Guide](./PLANNING.md) - Technical architecture and design decisions
- [📋 Task Management](./TASK.md) - Current development progress and roadmap
- [🔍 Production Audit](./docs/audits/PRODUCTION_AUDIT.md) - Comprehensive quality assessment
- [📖 Project Overview](./docs/guides/PROJECT_OVERVIEW.md) - Detailed project description

### **Development Guides**
- [🚀 Getting Started](./docs/guides/getting-started.md) - Setup and development workflow
- [🧪 Testing Guide](./docs/guides/testing.md) - Testing strategies and best practices
- [🎨 Design System](./docs/design/design-system.md) - UI/UX guidelines and components
- [🔐 Security Guide](./docs/guides/security.md) - Security best practices
- [🚀 Deployment Guide](./docs/guides/vercel-deployment.md) - Vercel deployment instructions

### **Business Documentation**
- [🎯 UX Conversion Guide](./docs/design/UX_CONVERSION_GUIDE.md) - Design principles for high conversion
- [📈 Analytics Guide](./docs/guides/analytics.md) - Business intelligence and metrics
- [🌍 Localization Guide](./docs/guides/localization.md) - Multi-market support

---

## 🤝 Contributing

### **Development Setup**
1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Make your changes and add tests
5. Run quality checks: `npm run quality`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to your branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### **Code Standards**
- **TypeScript**: Strict mode enabled, no `any` types
- **Component Size**: Maximum 500 lines of code per file
- **Test Coverage**: Minimum 95% coverage for new features
- **Accessibility**: WCAG 2.2 AA compliance required
- **Performance**: Core Web Vitals in "Good" threshold

### **Commit Convention**
```
feat: add amazing new feature
fix: resolve critical bug in payments
docs: update API documentation
test: add unit tests for dashboard
refactor: improve component architecture
```

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE) - see the LICENSE file for details.

---

## 🔗 Links

- **🌐 Live Demo**: [jirani-demo.vercel.app](https://jirani-demo.vercel.app)
- **📱 Mobile App**: Coming Soon
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/your-org/jirani/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/your-org/jirani/discussions)
- **📧 Support**: support@jirani.co

---

## 🙏 Acknowledgments

- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful and accessible component library
- **[Supabase](https://supabase.com/)** - Powerful backend-as-a-service platform
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Vercel](https://vercel.com/)** - Seamless deployment and hosting
- **African SME Community** - Inspiration and feedback for local market needs

---

<div align="center">

**Built with ❤️ for African SMEs**

*Empowering local businesses to thrive in the digital economy*

</div>
