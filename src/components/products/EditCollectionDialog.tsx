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
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['categories']['Row'];
type CollectionUpdate = Database['public']['Tables']['categories']['Update'];

interface EditCollectionDialogProps {
  collection: Collection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (collection: CollectionUpdate) => void;
}

export function EditCollectionDialog({ 
  collection, 
  open, 
  onOpenChange,
  onSave
}: EditCollectionDialogProps) {
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
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (collection) {
      setFormData({
        name: collection.name,
        description: collection.description
      });
      setImageUrl(collection.image_url);
    }
  }, [collection]);

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
      const result = await uploadCollectionImage(file, user?.id, true);
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
    if (!collection) return;
    
    setIsLoading(true);
    
    try {
      // Only upload image if a new one was selected
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImageToStorage(imageFile);
      }

      // Keep the original store_id when updating
      onSave({
        id: collection.id,
        ...formData,
        store_id: collection.store_id, // Preserve the original store_id
        image_url: finalImageUrl
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating collection:", error);
      toast({
        variant: "destructive",
        title: "Error updating collection",
        description: "Failed to update collection. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!collection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>
              Make changes to this collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
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
                  <label htmlFor="edit-collection-image-upload" className="cursor-pointer">
                    <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                      Select Image
                    </div>
                  </label>
                  <Input
                    id="edit-collection-image-upload"
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