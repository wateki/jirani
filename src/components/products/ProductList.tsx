import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

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

  if (isLoading) {
    return <div>Loading products...</div>;
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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                No products found. Add a product to get started.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const status = getInventoryStatus(product.stock_quantity);
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-medium flex items-center space-x-3">
                    {product.image_url && (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="h-10 w-10 object-cover rounded"
                      />
                    )}
                    <span>{product.name}</span>
                  </TableCell>
                  <TableCell>{product.categories?.name || 'Uncategorized'}</TableCell>
                  <TableCell>{product.sku || 'N/A'}</TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.stock_quantity}</TableCell>
                  <TableCell>
                    <Badge className={status.color} variant="outline">
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/products/${product.id}/edit`)}
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
  );
};

export default ProductList;
