import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  GlassWater, 
  Sofa, 
  Smartphone, 
  Shirt, 
  UtensilsCrossed, 
  Cake, 
  Pill, 
  Book, 
  Dog,
  Store
} from "lucide-react";
import { BusinessType, RegistrationData } from "@/types/database";

interface BusinessTypeStepProps {
  data: RegistrationData;
  onDataChange: (data: Partial<RegistrationData>) => void;
  businessTypes: BusinessType[];
}

const getBusinessTypeIcon = (iconName: string | null) => {
  if (!iconName) return <Store className="h-8 w-8" />;
  
  const iconMap: { [key: string]: React.ReactElement } = {
    'ShoppingCart': <ShoppingCart className="h-8 w-8" />,
    'GlassWater': <GlassWater className="h-8 w-8" />,
    'Sofa': <Sofa className="h-8 w-8" />,
    'Smartphone': <Smartphone className="h-8 w-8" />,
    'Shirt': <Shirt className="h-8 w-8" />,
    'UtensilsCrossed': <UtensilsCrossed className="h-8 w-8" />,
    'Cake': <Cake className="h-8 w-8" />,
    'Pill': <Pill className="h-8 w-8" />,
    'Book': <Book className="h-8 w-8" />,
    'Dog': <Dog className="h-8 w-8" />,
  };
  
  return iconMap[iconName] || <Store className="h-8 w-8" />;
};

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case 'retail': return 'bg-blue-100 text-blue-800';
    case 'food-service': return 'bg-green-100 text-green-800';
    case 'ecommerce': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const BusinessTypeStep: React.FC<BusinessTypeStepProps> = ({
  data,
  onDataChange,
  businessTypes,
}) => {
  // Group business types by category
  const groupedTypes = businessTypes.reduce((acc, type) => {
    const category = type.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(type);
    return acc;
  }, {} as Record<string, BusinessType[]>);

  const handleTypeSelect = (type: BusinessType) => {
    onDataChange({ businessType: type });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600">
          Choose the business type that best describes your store. This will help us customize 
          your experience and provide relevant templates and features.
        </p>
      </div>

      {Object.entries(groupedTypes).map(([category, types]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg capitalize">{category.replace('-', ' ')}</h3>
            <Badge variant="secondary" className={getCategoryColor(category)}>
              {types.length} options
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {types.map((type) => (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  data.businessType?.id === type.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleTypeSelect(type)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      data.businessType?.id === type.id 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {getBusinessTypeIcon(type.icon)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{type.display_name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-sm">
                    {type.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {data.businessType && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              {getBusinessTypeIcon(data.businessType.icon)}
            </div>
            <div>
              <h4 className="font-medium text-green-900">Selected: {data.businessType.display_name}</h4>
              <p className="text-sm text-green-700">{data.businessType.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 