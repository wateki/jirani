import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

type Product = Database['public']['Tables']['products']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null;
  sku?: string;
};

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
}

const ProductList = ({ products, isLoading, onDelete }: ProductListProps) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Check if viewport is mobile width
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading products...</span>
      </div>
    );
  }

  // Get inventory status badge color and label
  const getInventoryStatus = (quantity: number) => {
    if (quantity <= 0) {
      return { 
        color: "text-red-800 bg-red-100",
        label: "Out of Stock" 
      };
    } else if (quantity <= 5) {
      return { 
        color: "text-yellow-800 bg-yellow-100",
        label: "Low Stock" 
      };
    } else {
      return { 
        color: "text-green-800 bg-green-100",
        label: "In Stock" 
      };
    }
  };

  // Mobile card view for products
  if (isMobile) {
    return (
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="text-center py-8 px-4 border rounded-md bg-gray-50">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No products found. Add a product to get started.</p>
          </div>
        ) : (
          products.map((product) => {
            const status = getInventoryStatus(product.stock_quantity);
            return (
              <Card key={product.id} className="p-4">
                <div className="flex items-center mb-3">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="h-12 w-12 object-cover rounded mr-3"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center mr-3">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{product.name}</h3>
                    <p className="text-xs text-gray-500">{product.categories?.name || 'Uncategorized'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <span className="text-xs text-gray-500 block">SKU</span>
                    <span className="text-sm">{product.sku || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Price</span>
                    <span className="text-sm font-medium">KSh {product.price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Stock</span>
                    <span className="text-sm">{product.stock_quantity}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Status</span>
                    <Badge className={`text-xs ${status.color}`} variant="outline">
                      {status.label}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/dashboard/products/${product.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/dashboard/products/${product.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
            <TableHead>Price</TableHead>
              <TableHead className="hidden md:table-cell">Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p>No products found. Add a product to get started.</p>
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const status = getInventoryStatus(product.stock_quantity);
              return (
                <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="h-10 w-10 object-cover rounded"
                      />
                        ) : (
                          <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                    )}
                        <span className="text-sm">{product.name}</span>
                      </div>
                  </TableCell>
                    <TableCell className="hidden md:table-cell">{product.categories?.name || 'Uncategorized'}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.sku || 'N/A'}</TableCell>
                    <TableCell>KSh {product.price.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.stock_quantity}</TableCell>
                  <TableCell>
                    <Badge className={status.color} variant="outline">
                      {status.label}
                    </Badge>
                  </TableCell>
                    <TableCell className="text-right space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                        onClick={() => navigate(`/dashboard/products/${product.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                        onClick={() => navigate(`/dashboard/products/${product.id}/edit`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {onDelete && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};

export default ProductList;
