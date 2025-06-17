import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit, Trash2, Eye, Image } from "lucide-react";
import { useState, useEffect } from "react";
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
        <span className="ml-3 text-gray-600">Loading collections...</span>
      </div>
    );
  }

  // Mobile card view for collections
  if (isMobile) {
    return (
      <div className="space-y-4">
        {collections.length === 0 ? (
          <div className="text-center py-8 px-4 border rounded-md bg-gray-50">
            <Image className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No collections found. Add a collection to get started.</p>
          </div>
        ) : (
          collections.map((collection) => (
            <Card key={collection.id} className="p-4">
              <div className="flex items-center mb-3">
                {collection.image_url ? (
                  <img 
                    src={collection.image_url} 
                    alt={collection.name} 
                    className="h-12 w-12 object-cover rounded mr-3"
                  />
                ) : (
                  <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center mr-3">
                    <Image className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{collection.name}</h3>
                  <p className="text-xs text-gray-500">
                    {collection.description || 'No description'}
                  </p>
                </div>
              </div>
              
              <div className="mb-3">
                <span className="text-xs text-gray-500 block">Created</span>
                <span className="text-sm">{new Date(collection.created_at).toLocaleDateString()}</span>
              </div>
              
              <div className="flex justify-end space-x-1">
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
              </div>
            </Card>
          ))
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Collection Name</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden lg:table-cell">Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  <Image className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p>No collections found. Add a collection to get started.</p>
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
                  <TableCell className="hidden md:table-cell">
                    {collection.description || 'No description'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {new Date(collection.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
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
    </div>
  );
};

export default CollectionList;
