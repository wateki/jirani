import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CollectionList from "./CollectionList";
import { ViewCollectionDialog } from "./ViewCollectionDialog";
import { EditCollectionDialog } from "./EditCollectionDialog";
import { CreateCollectionDialog } from "./CreateCollectionDialog";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['categories']['Row'];
type CollectionUpdate = Database['public']['Tables']['categories']['Update'];
type CollectionInsert = Database['public']['Tables']['categories']['Insert'];

const CollectionsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewCollection, setViewCollection] = useState<Collection | null>(null);
  const [editCollection, setEditCollection] = useState<Collection | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: collections, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*');
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching collections",
          description: error.message
        });
        throw error;
      }
      
      return data;
    }
  });

  const deleteCollection = useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', collectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Success",
        description: "Collection deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error deleting collection",
        description: error.message
      });
    }
  });

  const updateCollection = useMutation({
    mutationFn: async (collection: CollectionUpdate) => {
      const { error } = await supabase
        .from('categories')
        .update(collection)
        .eq('id', collection.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Success",
        description: "Collection updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error updating collection",
        description: error.message
      });
    }
  });

  const createCollection = useMutation({
    mutationFn: async (collection: CollectionInsert) => {
      const { error } = await supabase
        .from('categories')
        .insert(collection);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Success",
        description: "Collection created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error creating collection",
        description: error.message
      });
    }
  });

  const handleView = (collection: Collection) => {
    setViewCollection(collection);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (collection: Collection) => {
    setEditCollection(collection);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (collection: CollectionUpdate) => {
    updateCollection.mutate(collection);
  };

  const handleCreate = (collection: CollectionInsert) => {
    createCollection.mutate(collection);
  };

  const filteredCollections = collections?.filter(collection => 
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Collections</CardTitle>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Collection
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search collections..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <CollectionList 
          collections={filteredCollections || []} 
          isLoading={isLoading}
          onDelete={(id) => deleteCollection.mutate(id)}
          onView={handleView}
          onEdit={handleEdit}
        />
      </CardContent>

      {/* View Collection Dialog */}
      <ViewCollectionDialog
        collection={viewCollection}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />

      {/* Edit Collection Dialog */}
      <EditCollectionDialog
        collection={editCollection}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleUpdate}
      />

      {/* Create Collection Dialog */}
      <CreateCollectionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={handleCreate}
      />
    </Card>
  );
};

export default CollectionsPage;
