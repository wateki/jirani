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
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { uploadCollectionImage } from "@/utils/storage";
import { getUserStoreId } from "@/utils/store";
import type { Database } from "@/integrations/supabase/types";

type CollectionInsert = Database['public']['Tables']['categories']['Insert'];

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (collection: CollectionInsert) => void;
}

export function CreateCollectionDialog({ 
  open, 
  onOpenChange,
  onCreate
}: CreateCollectionDialogProps) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string | null;
  }>({
    name: "",
    description: null
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // If the dialog is opened, fetch the store ID
    if (open && user) {
      fetchStoreId();
    }
  }, [open, user]);

  const fetchStoreId = async () => {
    if (!user) return;
    
    try {
      const id = await getUserStoreId();
      if (!id) {
        toast({
          variant: "destructive",
          title: "Store not found",
          description: "Could not find your store. Please contact support."
        });
        return;
      }
      setStoreId(id);
    } catch (error) {
      console.error("Error fetching store ID:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load your store information"
      });
    }
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
      const result = await uploadCollectionImage(file, user?.id);
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
      
      // Create the collection with the retrieved store ID
      onCreate({
        ...formData,
        store_id: storeId,
        image_url: finalImageUrl
      });
      
      // Reset form
      setFormData({
        name: "",
        description: null
      });
      setImageUrl(null);
      setImageFile(null);
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating collection:", error);
      toast({
        variant: "destructive",
        title: "Error creating collection",
        description: "Failed to create collection. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Add a new collection to organize your products.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter collection name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                placeholder="Enter collection description"
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Collection Image</Label>
              {!imageUrl ? (
                <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center relative">
                  <div className="mb-4">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Drag and drop image here</p>
                  <p className="text-xs text-gray-400 mt-1 mb-3">
                    SVG, PNG, JPG or GIF (max. 2MB)
                  </p>
                  <label htmlFor="collection-image-upload" className="cursor-pointer">
                    <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                      Select Image
                    </div>
                  </label>
                  <Input
                    id="collection-image-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageUpload}
                  />
                </div>
              ) : (
                <div className="relative">
                  <img src={imageUrl} alt="Collection preview" className="rounded-md max-h-64 object-contain" />
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadingImage || isLoading || !storeId}>
              {uploadingImage || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>{uploadingImage ? "Uploading..." : "Creating..."}</span>
                </>
              ) : (
                "Create Collection"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 