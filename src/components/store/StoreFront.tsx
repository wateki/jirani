import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StoreRouter from "./StoreRouter";
import { CartProvider } from "@/contexts/CartContext";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

const StoreFront = () => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchStoreSettings = async () => {
      if (!storeSlug) {
        setError("Store not found");
        setLoading(false);
        return;
      }
      
      try {
        // Fetch store settings based on slug
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_slug', storeSlug)
          .single();
        
        if (error) throw error;
        if (!data) {
          setError("Store not found");
        } else {
          setStoreSettings(data);
        }
      } catch (err: any) {
        console.error('Error fetching store settings:', err);
        setError(err.message || "Failed to load store");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStoreSettings();
  }, [storeSlug]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error || !storeSettings) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-4">Store Not Available</h1>
        <p className="text-gray-600 mb-6">{error || "The store you're looking for doesn't exist or hasn't been configured yet."}</p>
        <a href="/dashboard" className="text-primary hover:underline">
          Go to Dashboard
        </a>
      </div>
    );
  }
  
  return (
    <CartProvider>
      <StoreRouter 
        primaryColor={storeSettings.primary_color || "#c26e6e"} 
        secondaryColor={storeSettings.secondary_color || "#e74c3c"}
        storeName={storeSettings.store_name}
        storeSettings={storeSettings}
        useModernTemplate={true}
      />
    </CartProvider>
  );
};

export default StoreFront; 