import { useEffect, useMemo, useState } from "react";

import type { StoreInfo, StoreSettings } from "@/components/store-customizer/types";
import {
  createStoreSettingsPayload,
  generateStoreSlug,
  validateStoreInfo,
} from "@/components/store-customizer/utils";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadStoreBanner, uploadStoreLogo } from "@/utils/storage";

import getEnvironmentConfig, { generateStoreUrl } from "../config/environment";

export const useStoreCustomizer = () => {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: "Ji",
    description: "",
    primaryColor: "#c26e6e",
    secondaryColor: "#2EC4B6",
    heroHeading: "FIND CLOTHES THAT MATCHES YOUR STYLE",
    heroSubheading:
      "Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.",
    buttonStyle: "contained",
  });

  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoImageFile, setLogoImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Derived state
  const derivedStoreSlug = useMemo(() => generateStoreSlug(storeInfo.name), [storeInfo.name]);

  // Fetch store settings on component mount
  useEffect(() => {
    if (user?.id) {
      fetchStoreSettings();
    }
  }, [user?.id]);

  const fetchStoreSettings = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setStoreInfo({
          name: data.store_name || "Ji",
          description: data.store_description || "",
          primaryColor: data.primary_color || "#c26e6e",
          secondaryColor: data.secondary_color || "#2EC4B6",
          heroHeading: data.hero_heading || "FIND CLOTHES THAT MATCHES YOUR STYLE",
          heroSubheading:
            data.hero_subheading ||
            "Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.",
          buttonStyle: data.button_style || "contained",
        });

        setCoverImage(data.banner_url);
        setLogoImage(data.logo_url);
        setIsPublished(data.is_published || false);
      }
    } catch (error: any) {
      console.error("Error fetching store settings:", error);
      toast({
        variant: "destructive",
        title: "Error loading store settings",
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStoreInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStoreInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleButtonStyleChange = (value: string) => {
    setStoreInfo((prev) => ({ ...prev, buttonStyle: value }));
  };

  const handleCoverImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      setCoverImage(URL.createObjectURL(file));
    }
  };

  const handleLogoImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoImageFile(file);
      setLogoImage(URL.createObjectURL(file));
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      // Validate store info
      const validationError = validateStoreInfo(storeInfo);
      if (validationError) {
        throw new Error(validationError);
      }

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Upload images if new files are selected
      let logoUrl = logoImage;
      let bannerUrl = coverImage;
      let saveError = null;

      try {
        if (logoImageFile) {
          logoUrl = await uploadStoreLogo(logoImageFile, user.id);
        }
      } catch (error) {
        console.error("Error uploading logo:", error);
        saveError = new Error("Failed to upload logo. Please try again.");
      }

      try {
        if (coverImageFile) {
          bannerUrl = await uploadStoreBanner(coverImageFile, user.id);
        }
      } catch (error) {
        console.error("Error uploading banner:", error);
        saveError = error;
      }

      if (saveError) throw saveError;

      // Create the payload for database update
      const storeSlug = generateStoreSlug(storeInfo.name);
      const payload = createStoreSettingsPayload(
        storeInfo,
        logoUrl || undefined,
        bannerUrl || undefined,
        storeSlug
      );

      // Check if store exists
      const { data: existingStore } = await supabase
        .from("store_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let result;
      if (existingStore) {
        // Update existing store
        result = await supabase
          .from("store_settings")
          .update(payload)
          .eq("user_id", user.id)
          .select()
          .single();
      } else {
        // Create new store
        result = await supabase
          .from("store_settings")
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Update local files state to clear the upload file objects
      if (coverImageFile) {
        setCoverImageFile(null);
        setCoverImage(bannerUrl);
      }

      if (logoImageFile) {
        setLogoImageFile(null);
        setLogoImage(logoUrl);
      }

      toast({
        title: "Settings saved",
        description: "Your store customization has been saved successfully.",
      });

      return result.data;
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: error.message || "An unexpected error occurred",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handlePublishStore = async () => {
    setPublishing(true);

    try {
      const storeSlug = generateStoreSlug(storeInfo.name);

      if (!storeSlug) {
        throw new Error("Please provide a valid store name");
      }

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Update the store_settings table to mark as published
      const { error } = await supabase
        .from("store_settings")
        .update({
          is_published: true,
          store_slug: storeSlug,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setIsPublished(true);

      // Generate URLs using the helper function
      const primaryStoreUrl = generateStoreUrl(storeSlug);
      const storeUrl = `/store/${storeSlug}`;

      // Show success message with URL info
      toast({
        title: "Store Published!",
        description: `Your store is now live at: ${primaryStoreUrl} and also accessible at: ${window.location.origin}${storeUrl}`,
        duration: 8000,
      });
    } catch (error: any) {
      console.error("Error publishing store:", error);
      toast({
        variant: "destructive",
        title: "Error publishing store",
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handlePreviewStore = () => {
    const storeSlug = generateStoreSlug(storeInfo.name);
    const previewUrl = generateStoreUrl(storeSlug, true);
    window.open(previewUrl, "_blank");
  };

  return {
    // State
    storeInfo,
    coverImage,
    coverImageFile,
    logoImage,
    logoImageFile,
    loading,
    saving,
    publishing,
    isPublished,
    derivedStoreSlug,

    // Actions
    handleStoreInfoChange,
    handleButtonStyleChange,
    handleCoverImageUpload,
    handleLogoImageUpload,
    handleSaveSettings,
    handlePublishStore,
    handlePreviewStore,

    // Utils
    refetchSettings: fetchStoreSettings,
  };
};
