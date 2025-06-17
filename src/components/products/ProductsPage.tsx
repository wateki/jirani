import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductList from "./ProductList";
import { EditProductModal } from "./EditProductModal";
import { ProductDetailsModal } from "./ProductDetailsModal";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { getUserStoreId } from "@/utils/store";

type Product = Database['public']['Tables']['products']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null;
};
type ProductUpdate = Database['public']['Tables']['products']['Update'];

const ProductsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isLoadingStoreId, setIsLoadingStoreId] = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch the user's store ID
  useEffect(() => {
    const fetchStoreId = async () => {
      setIsLoadingStoreId(true);
      try {
        const id = await getUserStoreId();
        if (!id) {
          toast({
            variant: "destructive",
            title: "Store not found",
            description: "Could not find your store. Please contact support."
          });
        } else {
          setStoreId(id);
        }
      } catch (error) {
        console.error("Error fetching store ID:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load your store information"
        });
      } finally {
        setIsLoadingStoreId(false);
      }
    };

    fetchStoreId();
  }, [toast]);

  // Fetch products for the specific store
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id (
            id,
            name
          )
        `)
        .eq('store_id', storeId); // Filter by store ID for RLS security
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching products",
          description: error.message
        });
        throw error;
      }
      
      return data as Product[];
    },
    enabled: !!storeId, // Only run the query when storeId is available
  });

  // Fetch categories for the specific store
  const { data: categories } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId); // Filter by store ID for RLS security
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching categories",
          description: error.message
        });
        throw error;
      }
      
      return data;
    },
    enabled: !!storeId, // Only run the query when storeId is available
  });

  // Update product with store ID check for security
  const updateProduct = useMutation({
    mutationFn: async (product: ProductUpdate) => {
      if (!storeId) {
        throw new Error("Store ID not found");
      }
      
      const { error } = await supabase
        .from('products')
        .update(product)
        .eq('id', product.id)
        .eq('store_id', storeId); // Ensure RLS security
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      toast({
        title: "Success",
        description: "Product updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error updating product",
        description: error.message
      });
    }
  });

  // Delete product with store ID check
  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      if (!storeId) {
        throw new Error("Store ID not found");
      }
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('store_id', storeId); // Ensure RLS security
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error deleting product",
        description: error.message
      });
    }
  });

  const handleView = (product: Product) => {
    setViewProduct(product);
    setIsViewModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setIsEditModalOpen(true);
  };

  const handleUpdate = (product: ProductUpdate) => {
    updateProduct.mutate(product);
  };

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || categoryFilter === "all" || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Display loading state while fetching store ID
  const isLoading = isLoadingStoreId || (storeId && isLoadingProducts);

  return (
    <div>
      <div className="flex flex-row items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Items</h2>
        <Button onClick={() => navigate('/dashboard/products/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search items..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Collections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections</SelectItem>
            {categories?.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <ProductList 
        products={filteredProducts || []} 
        isLoading={isLoading}
        onDelete={(id) => deleteProduct.mutate(id)}
        onView={handleView}
        onEdit={handleEdit}
      />

      {/* View Product Modal */}
      {viewProduct && (
        <ProductDetailsModal
          product={viewProduct}
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          onEdit={handleEdit}
        />
      )}

      {/* Edit Product Modal */}
      <EditProductModal
        product={editProduct}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={handleUpdate}
      />
    </div>
  );
};

export default ProductsPage;
