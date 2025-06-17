import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  ShoppingBag, 
  Palette, 
  Check, 
  Loader2,
  Eye
} from "lucide-react";
import { RegistrationData } from "@/types/database";

interface ReviewAndConfirmStepProps {
  data: RegistrationData;
  onConfirm: () => void;
  isLoading: boolean;
}

export const ReviewAndConfirmStep: React.FC<ReviewAndConfirmStepProps> = ({
  data,
  onConfirm,
  isLoading,
}) => {
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const ColorPreview: React.FC<{ color: string }> = ({ color }) => (
    <div 
      className="w-4 h-4 rounded-full border border-gray-300"
      style={{ backgroundColor: color }}
    />
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
        <p className="text-gray-600">
          Please review all the information below. Once you confirm, we'll create your account 
          and set up your store.
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Full Name:</span>
            <span className="text-sm">{data.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Email:</span>
            <span className="text-sm">{data.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Business Name:</span>
            <span className="text-sm">{data.businessName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Business Type:</span>
            <span className="text-sm">{data.businessType?.display_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Store URL:</span>
            <span className="text-sm text-blue-600">
              jirani.com/{generateSlug(data.businessName)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Template Information */}
      {data.template && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              Selected Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium">Template:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{data.template.name}</span>
                {data.template.is_default && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                    Recommended
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Color Scheme:</span>
              <div className="flex items-center gap-2">
                <ColorPreview color={data.template.template_config.primary_color} />
                <ColorPreview color={data.template.template_config.secondary_color} />
                <span className="text-xs text-gray-500">Primary & Secondary</span>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-sm font-medium">Layout Style:</span>
              <span className="text-sm capitalize">
                {data.template.template_config.layout_style.replace('-', ' ')}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Default Categories:</span>
              <div className="flex flex-wrap gap-1">
                {data.template.template_config.default_categories.slice(0, 6).map((category, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
                {data.template.template_config.default_categories.length > 6 && (
                  <Badge variant="outline" className="text-xs">
                    +{data.template.template_config.default_categories.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Preview */}
      {data.template && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Store Preview
            </CardTitle>
            <CardDescription>
              Here's how your store will look to customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="bg-white p-6 rounded border">
                <div className="text-center">
                  <h2 
                    className="text-2xl font-bold mb-3"
                    style={{ color: data.template.template_config.primary_color }}
                  >
                    {data.businessName}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {data.template.template_config.hero_subheading}
                  </p>
                  <Button
                    style={{
                      backgroundColor: data.template.template_config.primary_color,
                      borderColor: data.template.template_config.primary_color,
                    }}
                    className={`text-white ${
                      data.template.template_config.button_style === 'rounded' ? 'rounded-full' : ''
                    }`}
                    variant={data.template.template_config.button_style === 'outlined' ? 'outline' : 'default'}
                  >
                    Shop Now
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Terms and Conditions */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="final-terms"
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required
            />
            <label htmlFor="final-terms" className="text-sm text-gray-700">
              I confirm that all the information provided is accurate and I agree to the{" "}
              <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                Terms of Service
              </a>
              ,{" "}
              <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                Privacy Policy
              </a>
              , and{" "}
              <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                Merchant Agreement
              </a>
              .
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Complete Registration Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          size="lg"
          className="w-full max-w-md bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Your Store...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Complete Registration & Launch Store
            </>
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>
          After registration, you'll be redirected to your dashboard where you can add products,
          customize your store further, and start selling!
        </p>
      </div>
    </div>
  );
}; 