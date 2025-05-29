# 🎨 Jirani Design System

**A comprehensive design system for creating consistent, accessible, and conversion-optimized user experiences across the Jirani platform.**

---

## 📋 Overview

The Jirani Design System is built around three core principles:
1. **Accessibility First** - WCAG 2.2 AA compliance is non-negotiable
2. **Conversion Optimization** - Every design decision supports business goals
3. **Consistency** - Unified experience across all touchpoints

---

## 🏗️ Design System Architecture

### Component Hierarchy
```
Design System
├── 🎨 Foundation
│   ├── Colors & Themes
│   ├── Typography
│   ├── Spacing & Layout
│   └── Iconography
├── 🧩 Components
│   ├── Base Components (shadcn/ui)
│   ├── Common Components
│   └── Feature Components
├── 📐 Patterns
│   ├── Layout Patterns
│   ├── Navigation Patterns
│   └── Form Patterns
└── 📄 Templates
    ├── Landing Pages
    ├── Dashboard Layouts
    └── Store Layouts
```

---

## 🌈 Color System

### Brand Colors
```css
/* Primary Brand Colors */
--primary-50: #eff6ff;
--primary-500: #3b82f6;
--primary-900: #1e3a8a;

/* Secondary Colors */
--secondary-orange: #f97316;
--secondary-green: #10b981;
--secondary-yellow: #f59e0b;
--secondary-red: #ef4444;
```

### Color Psychology Application
- **🔵 Blue (Primary)**: Trust, reliability, professionalism
- **🟠 Orange**: Call-to-action, energy, enthusiasm
- **🟢 Green**: Success, growth, positive actions
- **🟡 Yellow**: Attention, caution, highlights
- **🔴 Red**: Urgency, errors, important alerts

### Accessibility Standards
- **Contrast Ratios**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Color Independence**: Information never conveyed by color alone
- **High Contrast Support**: Full support for high contrast mode

---

## 📝 Typography System

### Font Stack
```css
/* Headings - Authority & Trust */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 600, 700, 800;

/* Body Text - Readability */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 400, 500;

/* Code & Data */
font-family: 'JetBrains Mono', 'Consolas', monospace;
```

### Type Scale
```css
/* Heading Hierarchy */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### Reading Experience
- **Line Height**: 1.5 for body text, 1.2 for headings
- **Letter Spacing**: Optimized for screen reading
- **Text Length**: Maximum 75 characters per line

---

## 📐 Spacing & Layout System

### Spacing Scale (4px base unit)
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Grid System
- **Mobile First**: 12-column grid with flexible breakpoints
- **Container**: Max-width 1280px with responsive padding
- **Gutters**: 16px mobile, 24px tablet, 32px desktop

### Breakpoints
```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet portrait */
--breakpoint-lg: 1024px;  /* Tablet landscape */
--breakpoint-xl: 1280px;  /* Desktop */
--breakpoint-2xl: 1536px; /* Large desktop */
```

---

## 🧩 Component Library

### Base Components (shadcn/ui)
- **Button**: Primary, secondary, ghost, destructive variants
- **Input**: Text, email, password, number with validation states
- **Dialog**: Modal windows with proper focus management
- **Card**: Content containers with consistent styling
- **Badge**: Status indicators and labels

### Common Components
- **StatCard**: Dashboard metric display
- **OverviewCard**: Summary information containers
- **DataTable**: Sortable, filterable data display
- **Toast**: Notification system
- **Loading**: Skeleton and spinner states

### Feature Components
- **ProductCard**: E-commerce product display
- **OrderCard**: Order management interface
- **CustomerCard**: Customer information display
- **StoreCustomizer**: Store branding interface

---

## 🎯 Conversion Design Patterns

### Landing Page Optimization
For detailed landing page design guidance, see our specialized guides:
- **[Landing Page Conversion Guide](./selling-design/landing-page-conversion-guide.md)** - Technical conversion optimization
- **[Customer-Centric Design Guide](./selling-design/customer-centric-design-guide.md)** - Customer-focused design principles

### Call-to-Action (CTA) Design
```css
/* Primary CTA */
.cta-primary {
  background: var(--secondary-orange);
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  min-height: 44px; /* Touch target */
}

/* Secondary CTA */
.cta-secondary {
  border: 2px solid var(--primary-500);
  color: var(--primary-500);
  background: transparent;
}
```

### Conversion Optimization Principles
1. **Visual Hierarchy**: Guide users through logical flow
2. **Cognitive Load**: Minimize mental effort required
3. **Social Proof**: Build trust through testimonials and reviews
4. **Urgency**: Create appropriate sense of urgency
5. **Mobile First**: Optimize for mobile conversion

---

## ♿ Accessibility Guidelines

### WCAG 2.2 AA Compliance
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators and logical tab order
- **Motion Preferences**: Respect reduced motion preferences

### Implementation Standards
```html
<!-- Semantic HTML Structure -->
<main role="main">
  <section aria-labelledby="products-heading">
    <h2 id="products-heading">Featured Products</h2>
    <!-- Content -->
  </section>
</main>

<!-- Interactive Elements -->
<button 
  aria-label="Add product to cart"
  aria-describedby="price-info"
>
  Add to Cart
</button>
```

### Testing Requirements
- **Automated**: Axe-core integration in CI/CD
- **Manual**: Regular keyboard and screen reader testing
- **User Testing**: Include users with disabilities

---

## 📱 Mobile-First Design

### Mobile Optimization Principles
- **Touch Targets**: Minimum 44px for interactive elements
- **Thumb Navigation**: Optimize for one-handed use
- **Progressive Enhancement**: Core functionality works on all devices
- **Performance**: Fast loading on mobile networks

### Responsive Component Design
```css
/* Mobile-first responsive design */
.component {
  /* Mobile styles */
  padding: var(--space-4);
  
  /* Tablet and up */
  @media (min-width: 768px) {
    padding: var(--space-6);
  }
  
  /* Desktop and up */
  @media (min-width: 1024px) {
    padding: var(--space-8);
  }
}
```

---

## 🔄 Component Development Guidelines

### Component Architecture
```typescript
// Component structure example
interface ComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
}

const Component = ({ variant = 'primary', size = 'md', ...props }) => {
  return (
    <div className={cn(baseStyles, variants[variant], sizes[size])}>
      {/* Component content */}
    </div>
  );
};
```

### Naming Conventions
- **Components**: PascalCase (e.g., `ProductCard`, `UserProfile`)
- **Props**: camelCase (e.g., `isLoading`, `onSubmit`)
- **CSS Classes**: kebab-case (e.g., `product-card`, `user-profile`)
- **Variants**: Descriptive and consistent (e.g., `primary`, `secondary`, `destructive`)

### Documentation Requirements
- **Storybook**: All components must have Storybook stories
- **Props**: Comprehensive prop documentation
- **Examples**: Usage examples for common scenarios
- **Accessibility**: ARIA requirements and keyboard interactions

---

## 🧪 Testing Strategy

### Visual Regression Testing
```bash
# Run visual tests
npm run test:visual

# Update snapshots
npm run test:visual:update
```

### Accessibility Testing
```bash
# Automated accessibility testing
npm run test:a11y

# Manual testing checklist
npm run test:a11y:manual
```

### Performance Testing
- **Lighthouse**: Regular Core Web Vitals monitoring
- **Bundle Analysis**: Component size impact analysis
- **Runtime Performance**: React DevTools profiling

---

## 📚 Design Resources

### Design Tokens
- **Figma**: Shared design token library
- **CSS Variables**: Consistent implementation across codebase
- **TypeScript**: Type-safe design token usage

### Icon System
```typescript
// Icon usage
import { ShoppingCart, User, Settings } from 'lucide-react';

<ShoppingCart 
  size={24} 
  className="text-primary-500" 
  aria-label="Shopping cart"
/>
```

### Asset Guidelines
- **Images**: WebP format with fallbacks, responsive sizing
- **SVG Icons**: Optimized and accessible
- **Illustrations**: Consistent style and brand alignment

---

## 🚀 Implementation Guidelines

### Getting Started
1. **Install Dependencies**: `npm install @jirani/design-system`
2. **Import Styles**: Include base styles and CSS variables
3. **Use Components**: Import and use design system components
4. **Follow Patterns**: Implement established design patterns

### Code Examples
```typescript
// Using the design system
import { Button, Card, Input } from '@jirani/design-system';

const LoginForm = () => (
  <Card>
    <Input type="email" placeholder="Email" />
    <Input type="password" placeholder="Password" />
    <Button variant="primary" size="lg">
      Sign In
    </Button>
  </Card>
);
```

### Customization
- **CSS Custom Properties**: Override design tokens
- **Component Variants**: Extend existing components
- **Theme Configuration**: Customize for brand requirements

---

## 📝 Contributing to the Design System

### Contribution Process
1. **RFC Process**: Submit design proposals for major changes
2. **Figma First**: Design in Figma before implementation
3. **Code Review**: Thorough review for quality and consistency
4. **Documentation**: Update documentation with changes

### Quality Standards
- **Accessibility**: WCAG 2.2 AA compliance required
- **Performance**: No performance regressions
- **Browser Support**: Cross-browser compatibility
- **Mobile First**: Responsive design required

---

## 🔗 Related Documentation

### Technical Documentation
- **[Technical Architecture](../architecture/TECHNICAL_ARCHITECTURE.md)** - System architecture overview
- **[Component Library](./component-library.md)** - Detailed component documentation
- **[Accessibility Guide](../guides/accessibility.md)** - Comprehensive accessibility standards

### Business Documentation
- **[UX Conversion Guide](./UX_CONVERSION_GUIDE.md)** - Business conversion principles
- **[Brand Guidelines](./brand-guidelines.md)** - Brand identity and voice
- **[User Research](./user-research.md)** - User insights and testing results

---

*This design system is maintained by the Jirani Design Team and updated regularly to reflect current best practices and user needs.*

**Last Updated**: May 2025  
**Version**: 2.0  
**Next Review**: June 2025 