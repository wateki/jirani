import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Palette, Layout, Check } from "lucide-react";
import { StoreTemplate, RegistrationData } from "@/types/database";

interface TemplateSelectionStepProps {
  data: RegistrationData;
  onDataChange: (data: Partial<RegistrationData>) => void;
  templates: StoreTemplate[];
}

export const TemplateSelectionStep: React.FC<TemplateSelectionStepProps> = ({
  data,
  onDataChange,
  templates,
}) => {
  const handleTemplateSelect = (template: StoreTemplate) => {
    onDataChange({ template });
  };

  // Helper function to safely get categories array
  const getCategoriesArray = (categories: any): string[] => {
    if (Array.isArray(categories)) {
      return categories;
    }
    if (typeof categories === 'string') {
      try {
        return JSON.parse(categories);
      } catch (e) {
        console.warn('Failed to parse categories:', e);
        return [];
      }
    }
    return [];
  };

  const getLayoutStyle = (layoutStyle: string) => {
    switch (layoutStyle) {
      case 'grid': return 'Grid Layout';
      case 'list': return 'List Layout';
      case 'card': return 'Card Layout';
      case 'showcase': return 'Showcase Layout';
      case 'masonry': return 'Masonry Layout';
      case 'menu': return 'Menu Layout';
      case 'shelf': return 'Shelf Layout';
      default: return 'Default Layout';
    }
  };

  const getButtonStyle = (buttonStyle: string) => {
    switch (buttonStyle) {
      case 'contained': return 'Solid Buttons';
      case 'outlined': return 'Outlined Buttons';
      case 'rounded': return 'Rounded Buttons';
      default: return 'Default Buttons';
    }
  };

  const ColorPreview: React.FC<{ color: string }> = ({ color }) => (
    <div 
      className="w-4 h-4 rounded-full border border-gray-300"
      style={{ backgroundColor: color }}
    />
  );

  if (!data.businessType) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a business type first.</p>
      </div>
    );
  }

  // Filter templates for the selected business type
  const businessTypeTemplates = templates.filter(template => 
    template.business_type_id === data.businessType?.id
  );

  if (businessTypeTemplates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No templates available for this business type.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">
          Templates for {data.businessType.display_name}
        </h3>
        <p className="text-gray-600">
          Choose a pre-designed template that matches your brand. You can customize colors, 
          content, and layout after registration.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {businessTypeTemplates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              data.template?.id === template.id
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleTemplateSelect(template)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.is_default && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Recommended
                      </Badge>
                    )}
                    {data.template?.id === template.id && (
                      <div className="p-1 rounded-full bg-blue-500 text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Template Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center mb-3">
                  <h4 
                    className="text-lg font-semibold mb-1"
                    style={{ color: template.template_config.primary_color }}
                  >
                    {template.template_config.hero_heading}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {template.template_config.hero_subheading}
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <Button
                    size="sm"
                    style={{
                      backgroundColor: template.template_config.primary_color,
                      borderColor: template.template_config.primary_color,
                    }}
                    className={`text-white ${
                      template.template_config.button_style === 'rounded' ? 'rounded-full' : ''
                    }`}
                    variant={template.template_config.button_style === 'outlined' ? 'outline' : 'default'}
                  >
                    Shop Now
                  </Button>
                </div>
              </div>

              {/* Template Features */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Colors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ColorPreview color={template.template_config.primary_color} />
                    <ColorPreview color={template.template_config.secondary_color} />
                    <span className="text-xs text-gray-500">Primary & Secondary</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Layout className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Layout</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {getLayoutStyle(template.template_config.layout_style)}
                  </div>
                </div>
              </div>

              {/* Default Categories */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Included Categories</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const categoryArray = getCategoriesArray(template.template_config.default_categories);
                    
                    return categoryArray.slice(0, 4).map((category, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ));
                  })()}
                  {(() => {
                    const categoryArray = getCategoriesArray(template.template_config.default_categories);
                    
                    return categoryArray.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{categoryArray.length - 4} more
                      </Badge>
                    );
                  })()}
                </div>
              </div>

              {/* Special Features */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Special Features</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(template.template_config)
                    .filter(([key, value]) => 
                      typeof value === 'boolean' && 
                      value === true && 
                      (key.startsWith('enable_') || key.startsWith('show_'))
                    )
                    .slice(0, 3)
                    .map(([key]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key.replace('enable_', '').replace('show_', '').replace('_', ' ')}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.template && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium text-green-900">Selected: {data.template.name}</h4>
              <p className="text-sm text-green-700">{data.template.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 