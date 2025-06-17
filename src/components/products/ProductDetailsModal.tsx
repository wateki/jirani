import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Package, Tag, DollarSign, Image, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'];
};

interface ProductDetailsModalProps {
  product: { id: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (product: Product) => void;
}

export function ProductDetailsModal({ 
  product, 
  open, 
  onOpenChange,
  onEdit
}: ProductDetailsModalProps) {
  const navigate = useNavigate();
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product?.id && open) {
      fetchProductDetails(product.id);
    }
  }, [product?.id, open]);

  const fetchProductDetails = async (productId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('id', productId)
        .single();
        
      if (error) throw error;
      setFullProduct(data);
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const getStatusConfig = (stockQuantity: number | null) => {
    if (!stockQuantity || stockQuantity === 0) {
      return { color: 'bg-red-100 text-red-800', label: 'Out of Stock' };
    }
    return { color: 'bg-green-100 text-green-800', label: 'In Stock' };
  };

  const handleEdit = () => {
    if (fullProduct && onEdit) {
      onEdit(fullProduct);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-600">Loading product details...</span>
          </div>
        ) : fullProduct ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Product Image */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border">
                {fullProduct.image_url ? (
                  <img
                    src={fullProduct.image_url}
                    alt={fullProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Product Details */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{fullProduct.name}</h2>
                <Badge className={`${getStatusConfig(fullProduct.stock_quantity).color} mb-4`} variant="outline">
                  {getStatusConfig(fullProduct.stock_quantity).label}
                </Badge>
              </div>

              {/* Description */}
              {fullProduct.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {fullProduct.description}
                  </p>
                </div>
              )}

              {/* Pricing & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Price</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    KSh {fullProduct.price.toFixed(2)}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Stock</span>
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    {fullProduct.stock_quantity || 0}
                  </p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-3">
                {fullProduct.sku && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">SKU:</span>
                    <span className="text-sm font-medium text-gray-900">{fullProduct.sku}</span>
                  </div>
                )}

                {fullProduct.categories && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Category:</span>
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {fullProduct.categories.name}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Created:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(fullProduct.created_at).toLocaleDateString()}
                  </span>
                </div>

                {fullProduct.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Updated:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(fullProduct.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 