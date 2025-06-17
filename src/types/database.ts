export interface BusinessType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreTemplate {
  id: string;
  business_type_id: string;
  name: string;
  description: string | null;
  template_config: TemplateConfig;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateConfig {
  primary_color: string;
  secondary_color: string;
  hero_heading: string;
  hero_subheading: string;
  button_style: 'contained' | 'outlined' | 'rounded';
  default_categories: string[];
  layout_style: 'grid' | 'list' | 'card' | 'showcase' | 'masonry' | 'menu' | 'shelf';
  [key: string]: any; // For business-specific configurations
}

export interface ExtendedStoreSettings {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  primary_color: string;
  secondary_color: string;
  banner_url: string | null;
  logo_url: string | null;
  hero_heading: string;
  hero_subheading: string;
  button_style: string;
  store_slug: string | null;
  is_published: boolean;
  business_type_id: string | null;
  template_id: string | null;
  onboarding_completed: boolean;
  registration_step: number;
  created_at: string;
  updated_at: string;
}

export interface RegistrationData {
  name: string;
  email: string;
  password: string;
  businessName: string;
  businessType: BusinessType | null;
  template: StoreTemplate | null;
  currentStep: number;
} 