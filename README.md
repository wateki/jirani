# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7a156c6a-df8a-4d49-a609-b1e95735970a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7a156c6a-df8a-4d49-a609-b1e95735970a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7a156c6a-df8a-4d49-a609-b1e95735970a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

# Shopify Builder Kit

A toolkit for building and customizing Shopify-like StoreFronts.

## Recent Updates

### Store Customization Features

We've implemented comprehensive store customization features that allow store owners to:

1. **Customize Hero Text**
   - Edit the heading and subheading text that appears on the store landing page
   - Personalize the messaging to match the store's brand and target audience

2. **Color Customization**
   - Change primary and secondary colors throughout the store
   - Preview changes in real-time before publishing

3. **Cover Image Uploads**
   - Upload custom banner images for the hero section
   - Replace the default placeholder with brand-specific imagery

4. **Button Style Selection**
   - Choose from 3 button styles: contained, outlined, and zig-zag
   - Apply consistent button styling throughout the store

The customization changes are saved to the database in the `store_settings` table, which has been extended with the following fields:
- `hero_heading`: The main heading text on the landing page
- `hero_subheading`: The subtext displayed below the heading
- `button_style`: The style of buttons used throughout the store (contained, outlined, or zig-zag)

### Multi-tenant Architecture

The application follows a multi-tenant architecture where:
- Each store owner has their own data set
- Shared services handle payment processing, order management, etc.
- Store settings are customizable per tenant

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up a Supabase project and update the environment variables
4. Run the development server with `npm run dev`

## Database Setup

When deploying, run the migrations to set up the database schema:

```bash
npx supabase migration up
```

This will apply all migrations, including adding the new customization fields to the `store_settings` table.

## Documentation

See the `docs` folder for detailed documentation on:
- Product vision and architecture
- Implementation details
- Development guidelines

## Features

### 🏪 Multi-Store Management
- Create and manage multiple store outlets
- Store-specific product inventory and pricing
- Centralized dashboard for all outlets

### 🛒 **Real-Time Cart Tracking** (NEW)
- **Live cart analytics** on business dashboard
- Real-time monitoring of active shopping sessions
- Automatic cart abandonment detection (24-hour timeout)
- Lost revenue tracking from abandoned carts
- Cart conversion rate analytics
- No polling - uses Supabase real-time subscriptions for instant updates

### 📦 Product Management
- Easy product catalog management
- Category-based organization
- Multi-image support for products
- Stock quantity tracking
- Featured product highlighting

### 🛍️ Customer Shopping Experience
- Beautiful, customizable storefronts
- Shopping cart functionality with persistent sessions
- Responsive design for mobile and desktop
- Guest checkout support
- Order tracking and history

### 📊 Business Analytics
- Real-time sales metrics
- Customer behavior insights
- Cart abandonment analysis
- Revenue tracking per outlet
- Inventory management insights

### 🔐 Authentication & Security
- Secure user authentication via Supabase Auth
- Row Level Security (RLS) for data protection
- Store owner permissions and access control

### 🎨 Customization
- Store branding and theming
- Custom color schemes
- Logo and banner uploads
- Personalized store slugs

---

## Cart Tracking & Analytics

The platform now includes comprehensive real-time cart tracking:

### For Business Owners:
- **Active Carts**: See customers currently shopping in real-time
- **Abandoned Carts**: Track carts left incomplete after 24 hours
- **Lost Revenue**: Calculate potential revenue from abandoned carts
- **Conversion Insights**: Get actionable recommendations to improve sales

### Technical Implementation:
- **Real-time subscriptions**: No polling, instant updates via Supabase real-time
- **Efficient database queries**: Optimized analytics functions
- **Automatic cleanup**: Old cart sessions removed after 30 days
- **Guest support**: Cart tracking works without user accounts

### Real-time Features:
- Live cart analytics updates
- Instant notification of new shopping sessions
- Automatic abandonment detection
- Cart-to-order conversion tracking
