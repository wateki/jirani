import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShoppingBag, FileText, Check, X, Loader2 } from "lucide-react";
import { RegistrationData } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";

interface BusinessDetailsStepProps {
  data: RegistrationData;
  onDataChange: (data: Partial<RegistrationData>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const BusinessDetailsStep: React.FC<BusinessDetailsStepProps> = ({ data, onDataChange, onValidationChange }) => {
  const [slugValidation, setSlugValidation] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isAvailable: null,
    message: ""
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugValidation({
        isChecking: false,
        isAvailable: null,
        message: ""
      });
      return;
    }

    // Ensure an authenticated session is present before querying (RLS requirement)
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      setSlugValidation({
        isChecking: true,
        isAvailable: null,
        message: "Signing you in..."
      });
      // Retry shortly – auth state can settle right after sign up
      setTimeout(() => {
        void checkSlugAvailability(slug);
      }, 400);
      return;
    }

    setSlugValidation({
      isChecking: true,
      isAvailable: null,
      message: "Checking availability..."
    });

    try {
      // Use RPC that is granted to anon/auth
      const { data: taken, error } = await (supabase as any)
        .rpc('is_store_slug_taken', { p_slug: slug });

      if (error) {
        setSlugValidation({
          isChecking: false,
          isAvailable: null,
          message: "Unable to check availability. Please try again."
        });
        return;
      }

      if (taken === true) {
        setSlugValidation({
          isChecking: false,
          isAvailable: false,
          message: "This URL is already taken. Please try a different name."
        });
      } else {
        setSlugValidation({
          isChecking: false,
          isAvailable: true,
          message: "This URL is available!"
        });
      }
    } catch (error) {
      setSlugValidation({
        isChecking: false,
        isAvailable: null,
        message: "Error checking availability. Please try again."
      });
    }
  };

  // Debounced slug checking
  useEffect(() => {
    const slug = generateSlug(data.businessName);
    if (slug) {
      const timeoutId = setTimeout(() => {
        void checkSlugAvailability(slug);
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      setSlugValidation({
        isChecking: false,
        isAvailable: null,
        message: ""
      });
    }
  }, [data.businessName]);

  // Notify parent of validation state
  useEffect(() => {
    if (onValidationChange) {
      const isValid = slugValidation.isAvailable === true && !slugValidation.isChecking;
      onValidationChange(isValid);
    }
  }, [slugValidation, onValidationChange]);

  const handleBusinessNameChange = (value: string) => {
    onDataChange({ 
      businessName: value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600">
          Tell us more about your business. This information will help us set up your store 
          and create a professional presence for your customers.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <div className="relative">
            <ShoppingBag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="businessName"
              type="text"
              placeholder="Your Store Name"
              value={data.businessName}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              className={`pl-10 pr-10 ${
                slugValidation.isAvailable === false 
                  ? 'border-red-500 focus:border-red-500' 
                  : slugValidation.isAvailable === true 
                    ? 'border-green-500 focus:border-green-500' 
                    : ''
              }`}
              required
            />
            {/* Validation Icon */}
            {slugValidation.isChecking && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
            )}
            {!slugValidation.isChecking && slugValidation.isAvailable === true && (
              <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
            {!slugValidation.isChecking && slugValidation.isAvailable === false && (
              <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
            )}
          </div>
          <p className="text-xs text-gray-500">
            This will be the main name displayed on your store
          </p>
          {/* Validation Message */}
          {slugValidation.message && (
            <p className={`text-xs ${
              slugValidation.isAvailable === true 
                ? 'text-green-600' 
                : slugValidation.isAvailable === false 
                  ? 'text-red-600' 
                  : 'text-gray-500'
            }`}>
              {slugValidation.message}
            </p>
          )}
        </div>

        {data.businessName && (
          <div className="space-y-2">
            <Label htmlFor="storeUrl">Store URL Preview</Label>
            <div className={`p-3 rounded-lg border ${
              slugValidation.isAvailable === false 
                ? 'bg-red-50 border-red-200' 
                : slugValidation.isAvailable === true 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
            }`}>
              <p className="text-sm text-gray-600">
                Your store will be available at:
              </p>
              <p className={`font-medium ${
                slugValidation.isAvailable === false 
                  ? 'text-red-600' 
                  : slugValidation.isAvailable === true 
                    ? 'text-green-600' 
                    : 'text-blue-600'
              }`}>
                jirani.com/{generateSlug(data.businessName)}
              </p>
              {slugValidation.isChecking && (
                <p className="text-xs text-gray-500 mt-1">
                  Checking availability...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="businessDescription">Business Description (Optional)</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Textarea
              id="businessDescription"
              placeholder="Tell your customers what makes your business special..."
              className="pl-10 min-h-[100px]"
              maxLength={500}
            />
          </div>
          <p className="text-xs text-gray-500">
            A brief description of your business (up to 500 characters)
          </p>
        </div>
      </div>

      {/* Preview Section */}
      {data.businessType && data.template && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-medium mb-3">Store Preview</h4>
          <div className="bg-white p-4 rounded border">
            <div className="text-center">
              <h3 
                className="text-xl font-bold mb-2"
                style={{ color: data.template.template_config.primary_color }}
              >
                {data.businessName || "Your Store Name"}
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                {data.template.template_config.hero_subheading}
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <ShoppingBag className="h-4 w-4" />
                <span>{data.businessType.display_name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Almost Done!</h4>
        <p className="text-sm text-blue-700">
          After registration, you'll have access to your dashboard where you can:
        </p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1">
          <li>• Add and manage your products</li>
          <li>• Customize your store design and colors</li>
          <li>• Set up payment and delivery options</li>
          <li>• Track orders and manage inventory</li>
        </ul>
      </div>
    </div>
  );
}; 