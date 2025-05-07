import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Image } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['categories']['Row'];

interface CollectionListProps {
  collections: Collection[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  onView?: (collection: Collection) => void;
  onEdit?: (collection: Collection) => void;
}

const CollectionList = ({ 
  collections, 
  isLoading, 
  onDelete,
  onView,
  onEdit 
}: CollectionListProps) => {
  if (isLoading) {
    return <div>Loading collections...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Collection Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                No collections found. Add a collection to get started.
              </TableCell>
            </TableRow>
          ) : (
            collections.map((collection) => (
              <TableRow key={collection.id}>
                <TableCell>
                  {collection.image_url ? (
                    <img 
                      src={collection.image_url} 
                      alt={collection.name} 
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                      <Image className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{collection.name}</TableCell>
                <TableCell>{collection.description || 'No description'}</TableCell>
                <TableCell>{new Date(collection.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onView && onView(collection)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEdit && onEdit(collection)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onDelete(collection.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CollectionList;
