import { Database } from "@/integrations/supabase/types";

export type StoreSettings = Database["public"]["Tables"]["store_settings"]["Row"];
export type StoreSettingsInsert = Database["public"]["Tables"]["store_settings"]["Insert"];

export interface StoreInfo {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  heroHeading: string;
  heroSubheading: string;
  buttonStyle: string;
}

export interface StorePreviewProps {
  heroHeading: string;
  heroSubheading: string;
  buttonStyle: string;
  primaryColor: string;
  secondaryColor: string;
  coverImage: string | null;
  logoImage: string | null;
  storeName: string;
}

export interface StoreCustomizerState {
  storeInfo: StoreInfo;
  coverImage: string | null;
  coverImageFile: File | null;
  logoImage: string | null;
  logoImageFile: File | null;
  loading: boolean;
  saving: boolean;
  publishing: boolean;
  isPublished: boolean;
  derivedStoreSlug: string;
}
