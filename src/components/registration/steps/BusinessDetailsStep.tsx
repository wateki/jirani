import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShoppingBag, FileText } from "lucide-react";
import { RegistrationData } from "@/types/database";

interface BusinessDetailsStepProps {
  data: RegistrationData;
  onDataChange: (data: Partial<RegistrationData>) => void;
}

export const BusinessDetailsStep: React.FC<BusinessDetailsStepProps> = ({ data, onDataChange }) => {
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  };

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
              className="pl-10"
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            This will be the main name displayed on your store
          </p>
        </div>

        {data.businessName && (
          <div className="space-y-2">
            <Label htmlFor="storeUrl">Store URL Preview</Label>
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600">
                Your store will be available at:
              </p>
              <p className="font-medium text-blue-600">
                jirani.com/{generateSlug(data.businessName)}
              </p>
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