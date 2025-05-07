import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Image } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['categories']['Row'];

interface ViewCollectionDialogProps {
  collection: Collection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewCollectionDialog({ 
  collection, 
  open, 
  onOpenChange 
}: ViewCollectionDialogProps) {
  if (!collection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collection Details</DialogTitle>
          <DialogDescription>
            View information about this collection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {collection.image_url && (
            <div className="flex justify-center mb-4">
              <img 
                src={collection.image_url} 
                alt={collection.name} 
                className="max-h-48 rounded-md object-contain"
              />
            </div>
          )}
          {!collection.image_url && (
            <div className="flex justify-center mb-4">
              <div className="h-32 w-32 bg-gray-100 rounded-md flex items-center justify-center">
                <Image className="h-10 w-10 text-gray-400" />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none text-muted-foreground">Name</h4>
            <p className="text-sm">{collection.name}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none text-muted-foreground">Description</h4>
            <p className="text-sm">{collection.description || 'No description provided'}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none text-muted-foreground">Created</h4>
            <p className="text-sm">{new Date(collection.created_at).toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 