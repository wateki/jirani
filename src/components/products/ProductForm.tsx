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
import { useNavigate, useParams, useLocation } from "react-router-dom";
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

interface ProductFormProps {
  isViewMode?: boolean;
}

const ProductForm = ({ isViewMode: propsViewMode }: ProductFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [fetchingStore, setFetchingStore] = useState(false);
  const [product, setProduct] = useState<any>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams<{ productId?: string }>();
  const { user } = useAuth();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormData>();

  const productName = watch("name");
  
  // Determine if we're in view mode based on URL or props
  const isViewMode = propsViewMode || (productId && productId !== 'new' && !location.pathname.includes('/edit'));
  
  // Fetch the product data if in view/edit mode
  useEffect(() => {
    if (productId && productId !== 'new' && productId !== 'edit') {
      fetchProductDetails(productId);
    }
  }, [productId]);
  
  const fetchProductDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setProduct(data);
        // Populate form fields
        setValue("name", data.name);
        setValue("description", data.description || '');
        setValue("price", data.price);
        setValue("stock_quantity", data.stock_quantity || 0);
        setValue("category_id", data.category_id || '');
        setSelectedCategory(data.category_id || '');
        setSku(data.sku || '');
        setImageUrl(data.image_url);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load product details"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImageToStorage(imageFile);
      }

      const productData = {
          ...data,
          user_id: user.id,
          store_id: storeId,
          price: parseFloat(data.price.toString()),
          stock_quantity: parseInt(data.stock_quantity.toString()),
          image_url: finalImageUrl,
        sku: sku
      };

      let error;
      
      // Check if we're updating or creating
      if (productId && productId !== 'new' && productId !== 'edit') {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId)
          .eq('store_id', storeId); // Ensure RLS security
          
        error = updateError;
      } else {
        // Create new product
        const { error: insertError } = await supabase
          .from('products')
          .insert(productData);
          
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: productId && productId !== 'new' && productId !== 'edit'
          ? "Product updated successfully" 
          : "Product created successfully",
      });

      // Redirect back to products page
      navigate('/dashboard/products');
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was an error saving the product",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isViewMode ? "Product Details" : productId && productId !== 'new' && productId !== 'edit' ? "Edit Product" : "Add New Product"}
        </h1>
        <div className="flex space-x-2">
          {isViewMode ? (
            <Button onClick={() => navigate(`/dashboard/products/${productId}/edit`)}>
              Edit Product
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/dashboard/products')}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isViewMode ? "Product Information" : "Product Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                    type="text"
                    disabled={isLoading || isViewMode}
                    placeholder="Enter product name"
                {...register("name", { required: "Product name is required" })}
              />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

                <div>
                  <Label htmlFor="price">Price (KSh)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                    min="0"
                    disabled={isLoading || isViewMode}
                    placeholder="0.00"
                    {...register("price", { 
                      required: "Price is required",
                      min: { value: 0, message: "Price must be greater than 0" }
                    })}
                />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
              </div>

                <div>
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                    min="0"
                    disabled={isLoading || isViewMode}
                    placeholder="0"
                    {...register("stock_quantity", { 
                      required: "Stock quantity is required",
                      min: { value: 0, message: "Stock quantity must be positive" }
                    })}
                />
                  {errors.stock_quantity && <p className="text-red-500 text-sm mt-1">{errors.stock_quantity.message}</p>}
            </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    disabled={loadingCategories || isLoading || isViewMode}
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
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

                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <div className="flex space-x-2">
                <Input
                  id="sku"
                  value={sku}
                      onChange={(e) => setSku(e.target.value)} 
                      disabled={isLoading || isViewMode}
                      placeholder="Auto-generated"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    SKU is auto-generated based on category and product name, but can be customized
                  </p>
                </div>
                    </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    disabled={isLoading || isViewMode}
                    placeholder="Enter product description"
                    className="h-32"
                    {...register("description")}
                  />
                </div>

                <div>
                  <Label>Product Image</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {imageUrl ? (
                <div className="relative">
                        <img
                          src={imageUrl}
                          alt="Product preview"
                          className="mx-auto max-h-48 object-contain"
                        />
                        {!isViewMode && (
                  <Button
                    type="button"
                            variant="ghost"
                            size="sm"
                    onClick={handleRemoveImage}
                            className="absolute top-0 right-0 text-red-500 bg-white rounded-full w-8 h-8 p-0 shadow"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                        )}
                      </div>
                    ) : (
                      !isViewMode && (
                        <div>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <label htmlFor="image-upload" className="cursor-pointer block mt-2">
                            <span className="text-primary font-medium">Click to upload</span>
                            <span className="text-gray-500"> or drag and drop</span>
                            <Input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="sr-only"
                              disabled={isLoading}
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!isViewMode && (
              <div className="flex justify-end space-x-3">
                <Button variant="outline" type="button" onClick={() => navigate('/dashboard/products')}>
                Cancel
              </Button>
                <Button type="submit" disabled={isLoading || uploadingImage}>
                  {isLoading || uploadingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadingImage ? "Uploading Image..." : "Saving..."}
                  </>
                ) : (
                    "Save Product"
                )}
              </Button>
            </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductForm;
