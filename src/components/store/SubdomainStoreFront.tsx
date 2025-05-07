import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StoreRouter from "./StoreRouter";
import StoreFront from "./StoreFront";
import { CartProvider } from "@/contexts/CartContext";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

const SubdomainStoreFront = () => {
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchStoreFromSubdomain = async () => {
      try {
        // Get subdomain from hostname
        const hostname = window.location.hostname;
        let subdomain;
        
        // Handle localhost development with store query param
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          const params = new URLSearchParams(window.location.search);
          subdomain = params.get('store');
          
          if (!subdomain) {
            setError("No store specified. Use ?store=<storeslug> in development mode.");
            setLoading(false);
            return;
          }
        } else {
          // In production, extract subdomain
          const parts = hostname.split('.');
          if (parts.length < 3) {
            setError("Invalid store URL");
            setLoading(false);
            return;
          }
          subdomain = parts[0];
        }
        
        // Fetch store by slug (which may be the subdomain)
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_slug', subdomain)
          .single();
        
        if (error) throw error;
        
        if (!data) {
          setError(`Store not found`);
        } else {
          setStoreSettings(data);
        }
      } catch (err: any) {
        console.error('Error fetching store:', err);
        setError(err.message || "Failed to load store");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStoreFromSubdomain();
  }, []);

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
      </div>
    );
  }

  // StoreRouter needs to know the base URL for all links, which is just '/' for subdomain stores
  return (
    <CartProvider>
      <StoreRouter
        primaryColor={storeSettings.primary_color || "#c26e6e"}
        storeName={storeSettings.store_name}
        storeSettings={storeSettings}
      />
    </CartProvider>
  );
};

export default SubdomainStoreFront; 