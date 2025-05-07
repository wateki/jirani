import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadProductImage } from "@/utils/storage";
import { getUserStoreId } from "@/utils/store";

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category_id: string;
}

const ProductForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [fetchingStore, setFetchingStore] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormData>();

  const productName = watch("name");

  // Fetch the store ID when component mounts
  useEffect(() => {
    if (user) {
      fetchStoreId();
    }
  }, [user]);

  const fetchStoreId = async () => {
    setFetchingStore(true);
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
      setFetchingStore(false);
    }
  };
  
  // Query to fetch categories
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId);
        
      if (error) throw error;
      return data;
    },
    enabled: !!storeId, // Only run the query when storeId is available
  });

  // Effect to generate SKU when category or product name changes
  useEffect(() => {
    if (selectedCategory && productName) {
      // Find the category by ID
      const category = categories?.find(cat => cat.id === selectedCategory);
      if (category) {
        // Create a prefix from the first 2 chars of the category name
        const prefix = category.name.substring(0, 2).toUpperCase();
        // Create a slug from the product name (first 3 chars)
        const productSlug = productName.substring(0, 3).toUpperCase();
        // Create a random 3 digit number
        const randomNum = Math.floor(Math.random() * 900) + 100;
        // Combine to form the SKU
        const generatedSku = `${prefix}-${productSlug}-${randomNum}`;
        setSku(generatedSku);
      }
    }
  }, [selectedCategory, productName, categories]);

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setValue("category_id", value);
  };

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
      const result = await uploadProductImage(file, user?.id);
      if (!result) {
        throw new Error("Failed to upload image");
      }
      return result;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        variant: "destructive",
        title: "Error uploading image",
        description: error.message,
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to create a product",
      });
      return;
    }

    if (!storeId) {
      toast({
        variant: "destructive",
        title: "Store not found",
        description: "Could not find your store. Please try again or contact support."
      });
      return;
    }

    setIsLoading(true);
    try {
      // Upload image if one was selected
      let finalImageUrl = null;
      if (imageFile) {
        finalImageUrl = await uploadImageToStorage(imageFile);
      }

      const { error } = await supabase
        .from('products')
        .insert({
          ...data,
          user_id: user.id,
          store_id: storeId,
          price: parseFloat(data.price.toString()),
          stock_quantity: parseInt(data.stock_quantity.toString()),
          image_url: finalImageUrl,
          sku: sku // Use the generated SKU
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product created successfully",
      });
      navigate('/products');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating product",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                {...register("name", { required: "Product name is required" })}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register("price", { required: "Price is required" })}
                />
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  {...register("stock_quantity", { required: "Stock quantity is required" })}
                />
                {errors.stock_quantity && (
                  <p className="text-sm text-red-500">{errors.stock_quantity.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Collection</Label>
              <Select onValueChange={handleCategoryChange} disabled={loadingCategories || !storeId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCategories ? "Loading collections..." : "Select a collection"} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                  {categories?.length === 0 && (
                    <SelectItem value="empty" disabled>
                      No collections found. Please create one first.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {sku && (
              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Generated)</Label>
                <Input
                  id="sku"
                  value={sku}
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  This SKU is automatically generated based on the collection and product name
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Product Image</Label>
              {!imageUrl ? (
                <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center relative">
                  <div className="mb-4">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Drag and drop image here</p>
                  <p className="text-xs text-gray-400 mt-1 mb-3">
                    SVG, PNG, JPG or GIF (max. 2MB)
                  </p>
                  <label htmlFor="product-image-upload" className="cursor-pointer">
                    <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                      Select Image
                    </div>
                  </label>
                  <Input
                    id="product-image-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageUpload}
                  />
                </div>
              ) : (
                <div className="relative">
                  <img src={imageUrl} alt="Product preview" className="rounded-md max-h-64 object-contain" />
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

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || uploadingImage || fetchingStore || !storeId || categories?.length === 0}
              >
                {isLoading || uploadingImage || fetchingStore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>
                      {uploadingImage ? "Uploading Image..." : 
                       fetchingStore ? "Loading Store..." : "Creating..."}
                    </span>
                  </>
                ) : (
                  "Create Product"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductForm;
