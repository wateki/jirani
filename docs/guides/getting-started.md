# 🚀 Getting Started with Jirani

**Welcome to Jirani!** This guide will walk you through setting up your development environment and getting the application running locally.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:

### Required Software
- **Node.js** 18.0.0 or higher
  - [Download from nodejs.org](https://nodejs.org/)
  - Or install via [nvm](https://github.com/nvm-sh/nvm): `nvm install 18 && nvm use 18`
- **npm** (comes with Node.js) or **yarn**
- **Git** for version control
- **VS Code** (recommended) with the following extensions:
  - ES7+ React/Redux/React-Native snippets
  - TypeScript Importer
  - Tailwind CSS IntelliSense
  - Prettier - Code formatter
  - ESLint

### Required Accounts
- **Supabase** account ([Sign up here](https://supabase.com/))
- **Vercel** account for deployment ([Sign up here](https://vercel.com/))

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/jirani.git
cd jirani

# If using SSH (recommended for contributors)
git clone git@github.com:your-org/jirani.git
cd jirani
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Or if you prefer yarn
yarn install
```

### 3. Environment Configuration

Create your environment configuration:

```bash
# Copy the environment template
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
VITE_APP_NAME=Jirani
VITE_APP_URL=http://localhost:5174

# Analytics (Optional for development)
VITE_VERCEL_ANALYTICS_ID=your_analytics_id
```

### 4. Database Setup

#### Option A: Using Existing Supabase Project

1. Create a new project on [Supabase](https://app.supabase.com/)
2. Copy your project URL and anon key to `.env.local`
3. Run the database migrations:

```bash
# Initialize Supabase locally (first time only)
npx supabase init

# Link to your remote project
npx supabase link --project-ref your-project-id

# Apply all migrations
npx supabase db push
```

#### Option B: Local Development Database

```bash
# Start local Supabase (requires Docker)
npx supabase start

# Apply migrations to local database
npx supabase db push
```

---

## 🏃‍♂️ Running the Application

### Development Server

```bash
# Start the development server
npm run dev

# Or with yarn
yarn dev
```

The application will be available at: **http://localhost:5174**

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build locally

# Quality Assurance
npm run type-check       # TypeScript type checking
npm run lint             # ESLint checking
npm run format           # Format code with Prettier
npm run quality          # Run all quality checks

# Testing
npm run test             # Run unit tests (watch mode)
npm run test:run         # Run unit tests (single run)
npm run test:coverage    # Run with coverage report
npm run test:e2e         # Run E2E tests
npm run test:all         # Run all tests

# Database
npx supabase db push     # Apply migrations
npx supabase db reset    # Reset database
npx supabase gen types typescript --local  # Generate TypeScript types
```

---

## 🗄️ Database Setup Details

### Understanding the Schema

The Jirani database uses a multi-tenant architecture with Row Level Security (RLS). Key tables include:

- **stores**: Store information and settings
- **products**: Product catalog per store
- **orders**: Order management and tracking
- **customers**: Customer accounts per store
- **categories**: Product categorization

### Sample Data

To populate your database with sample data for development:

```bash
# Run the seed script
npx supabase db reset --linked

# Or manually insert sample data
psql -h localhost -p 54322 -d postgres -U postgres -f supabase/seed.sql
```

### Working with Migrations

```bash
# Create a new migration
npx supabase migration new your_migration_name

# Apply specific migration
npx supabase migration up

# Check migration status
npx supabase migration list
```

---

## 🧪 Testing Setup

### Unit Testing with Vitest

```bash
# Run tests in watch mode
npm run test

# Run specific test file
npm run test Dashboard.test.tsx

# Run tests with coverage
npm run test:coverage
```

### E2E Testing with Playwright

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run in headed mode for debugging
npm run test:e2e:headed

# Run with UI for interactive debugging
npm run test:e2e:ui
```

---

## 🎨 Development Workflow

### Code Structure Guidelines

1. **Components**: Keep under 500 lines of code
2. **Hooks**: Extract business logic into custom hooks
3. **Types**: Define interfaces in dedicated type files
4. **Utils**: Create pure utility functions

### Component Creation Pattern

```typescript
// Example: Creating a new component
/src/components/features/orders/
├── OrderCard.tsx           // Main component
├── OrderCard.test.tsx      // Unit tests
├── hooks/
│   └── useOrderData.ts     // Data fetching logic
├── utils/
│   └── orderHelpers.ts     // Helper functions
└── types/
    └── order.types.ts      // Type definitions
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git add .
git commit -m "feat: add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug in component
docs: update documentation
test: add unit tests
refactor: improve code structure
style: fix formatting
chore: update dependencies
```

---

## 🔧 Development Tools Setup

### VS Code Configuration

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

### Recommended Extensions

Install the following VS Code extensions:

```bash
# Install via command palette (Ctrl/Cmd + P)
ext install bradlc.vscode-tailwindcss
ext install esbenp.prettier-vscode
ext install dbaeumer.vscode-eslint
ext install ms-vscode.vscode-typescript-next
ext install formulahendry.auto-rename-tag
```

---

## 🐛 Common Issues & Troubleshooting

### Port Already in Use

```bash
# If port 5174 is busy, specify a different port
npm run dev -- --port 3000
```

### Node Modules Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Supabase Connection Issues

1. Check your `.env.local` file has correct values
2. Verify your Supabase project is running
3. Check firewall/network settings

```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

### TypeScript Errors

```bash
# Regenerate types from Supabase
npx supabase gen types typescript --linked > src/types/supabase.ts

# Clear TypeScript cache
rm -rf node_modules/.cache
npm run type-check
```

### Build Errors

```bash
# Check for ESLint errors
npm run lint

# Check TypeScript compilation
npm run type-check

# Clean build
rm -rf dist
npm run build
```

---

## 📚 Next Steps

Now that you have Jirani running locally, here's what to explore next:

1. **📖 Read the [Architecture Guide](../architecture/TECHNICAL_ARCHITECTURE.md)** - Understand the system design
2. **📋 Check [Current Tasks](../../TASK.md)** - See what's being worked on
3. **🧪 Write Tests** - Follow the [Testing Guide](./testing.md)
4. **🎨 Review Design System** - Check the [Design Guide](../design/design-system.md)
5. **🔐 Security Practices** - Read the [Security Guide](./security.md)

### Key Areas for Contribution

- **Component Refactoring**: Help reduce large components (>500 LOC)
- **Test Coverage**: Add tests to reach 95% coverage goal
- **Performance**: Optimize bundle size and Core Web Vitals
- **Accessibility**: Enhance WCAG 2.2 AA compliance
- **Documentation**: Improve guides and API documentation

---

## 💬 Getting Help

### Resources

- **📖 Documentation**: Check the `/docs` folder
- **🐛 Issues**: [GitHub Issues](https://github.com/your-org/jirani/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/your-org/jirani/discussions)
- **📧 Email**: support@jirani.co

### Community Guidelines

- Be respectful and inclusive
- Follow the code of conduct
- Ask questions in discussions
- Report bugs with detailed information
- Contribute documentation improvements

---

## ✅ Verification Checklist

Before you start developing, ensure:

- [ ] Application runs at http://localhost:5174
- [ ] Database connection is working
- [ ] Authentication flow works (sign up/sign in)
- [ ] Tests pass: `npm run test:run`
- [ ] Linting passes: `npm run lint`
- [ ] TypeScript compiles: `npm run type-check`
- [ ] Build succeeds: `npm run build`

**🎉 Congratulations!** You're ready to start contributing to Jirani!

---

*This guide is maintained by the Jirani team. If you find any issues or have suggestions for improvement, please create an issue or submit a pull request.*

**Last Updated**: May 2025  
**Version**: 1.0 