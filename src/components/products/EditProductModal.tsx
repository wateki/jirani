import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { uploadProductImage } from "@/utils/storage";
import { getUserStoreId } from "@/utils/store";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'];
};
type ProductUpdate = Database['public']['Tables']['products']['Update'];

interface EditProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: ProductUpdate) => void;
}

export function EditProductModal({ 
  product, 
  open, 
  onOpenChange,
  onSave
}: EditProductModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string | null;
    price: number;
    stock_quantity: number;
    category_id: string | null;
    sku: string | null;
  }>({
    name: "",
    description: null,
    price: 0,
    stock_quantity: 0,
    category_id: null,
    sku: null
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch store ID
  useEffect(() => {
    if (user) {
      fetchStoreId();
    }
  }, [user]);

  const fetchStoreId = async () => {
    try {
      const id = await getUserStoreId();
      setStoreId(id);
    } catch (error) {
      console.error("Error fetching store ID:", error);
    }
  };

  // Query to fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId);
        
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        stock_quantity: product.stock_quantity || 0,
        category_id: product.category_id,
        sku: product.sku
      });
      setImageUrl(product.image_url);
    }
  }, [product]);

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setImageUrl(null);
    setImageFile(null);
  };

  // Upload image to storage
  const uploadImageToStorage = async (file: File) => {
    setUploadingImage(true);
    try {
      // Upload with compression and show stats in console
      const result = await uploadProductImage(file, user?.id, true);
      if (!result) {
        throw new Error("Failed to upload image");
      }
      return result;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        variant: "destructive",
        title: "Error uploading image",
        description: error.message || "Failed to upload image",
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    setIsLoading(true);
    
    try {
      // Only upload image if a new one was selected
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImageToStorage(imageFile);
      }

      // Keep the original store_id and user_id when updating
      onSave({
        id: product.id,
        ...formData,
        store_id: product.store_id, // Preserve the original store_id
        user_id: product.user_id, // Preserve the original user_id
        image_url: finalImageUrl
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        variant: "destructive",
        title: "Error updating product",
        description: "Failed to update product. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Make changes to this product.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price (KSh)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id || ""}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku || ""}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value || null })}
                    placeholder="Product SKU"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Product Image</Label>
                  {!imageUrl ? (
                    <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center relative">
                      <div className="mb-4">
                        <Upload className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">Drag and drop image here</p>
                      <p className="text-xs text-gray-400 mt-1 mb-3">
                        PNG, JPG, GIF up to 5MB
                      </p>
                      <label htmlFor="edit-product-image-upload" className="cursor-pointer">
                        <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                          Select Image
                        </div>
                      </label>
                      <Input
                        id="edit-product-image-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageUpload}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={imageUrl} alt="Product preview" className="rounded-md max-h-48 object-contain w-full" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadingImage || isLoading}>
              {uploadingImage || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>{uploadingImage ? "Uploading..." : "Saving..."}</span>
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 