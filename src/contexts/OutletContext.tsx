import React, { createContext, useContext, useState, useEffect } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { getUserStoreId } from "@/utils/store"
import { useToast } from "@/hooks/use-toast"

interface Outlet {
  id: string
  name: string
  address: string
  phone: string
  email: string
  is_main_outlet: boolean
  store_id: string
  created_at: string
  updated_at: string
}

interface OutletContextType {
  outlets: Outlet[]
  selectedOutlet: Outlet | null
  setSelectedOutlet: (outlet: Outlet | null) => void
  fetchOutlets: () => Promise<void>
  isLoading: boolean
}

const OutletContext = createContext<OutletContextType | undefined>(undefined)

export const useOutletContext = () => {
  const context = useContext(OutletContext)
  if (context === undefined) {
    throw new Error("useOutletContext must be used within an OutletProvider")
  }
  return context
}

export const OutletProvider = ({ children }: { children: React.ReactNode }) => {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = useSupabaseClient()
  const toast = useToast()

  const fetchOutlets = async () => {
    setIsLoading(true)
    console.log("Starting outlet fetch operation");
    
    try {
      // Get store ID using the getUserStoreId utility function
      const storeId = await getUserStoreId()
      console.log("Store ID for outlet fetch:", storeId);
      
      if (!storeId) {
        console.error("Store not found")
        setOutlets([])
        return
      }

      // Clear any existing outlets in state to avoid stale data
      setOutlets([]);

      // Fetch all outlets for this store
      const { data, error } = await supabase
        .from("outlets")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error fetching outlets:", error)
        throw error
      }

      console.log(`Fetched ${data?.length || 0} outlets:`, data);
      
      if (!data || data.length === 0) {
        console.log("No outlets found for store:", storeId);
        setOutlets([]);
        return;
      }
      
      // Important: Create a fresh array to trigger state update
      const fetchedOutlets = [...data];
      setOutlets(fetchedOutlets);
      
      // Debug outlets state after setting
      console.log("Outlets state set to:", fetchedOutlets);

      // Handle selected outlet logic
      if (!selectedOutlet && fetchedOutlets.length > 0) {
        // Try to find main outlet first
        const mainOutlet = fetchedOutlets.find((outlet) => outlet.is_main_outlet);
        
        if (mainOutlet) {
          console.log("Setting main outlet as selected:", mainOutlet.name);
          setSelectedOutlet(mainOutlet);
        } else {
          // If no main outlet, select the first one
          console.log("No main outlet found, selecting first outlet:", fetchedOutlets[0].name);
          setSelectedOutlet(fetchedOutlets[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching outlets:", error);
      setOutlets([]);
    } finally {
      setIsLoading(false);
      console.log("Outlet fetch operation completed");
    }
  }

  // Only fetch outlets on initial mount
  useEffect(() => {
    console.log("OutletContext mounted, fetching outlets");
    fetchOutlets();
    
    // Add an interval to periodically refresh outlets (every 30 seconds)
    /* const refreshInterval = setInterval(() => {
      console.log("Refreshing outlets list");
      fetchOutlets();
    }, 30000); */
    
    // Clean up interval on unmount
    return () => {};
  }, []);

  // Debug: Log when outlets state changes
  useEffect(() => {
    console.log("Outlets state updated, count:", outlets.length);
  }, [outlets]);

  return (
    <OutletContext.Provider
      value={{
        outlets,
        selectedOutlet,
        setSelectedOutlet,
        fetchOutlets,
        isLoading
      }}
    >
      {children}
    </OutletContext.Provider>
  )
} 