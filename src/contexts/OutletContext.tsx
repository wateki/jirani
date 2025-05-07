import React, { createContext, useContext, useState, useEffect } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"

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
  const supabase = useSupabaseClient()

  const fetchOutlets = async () => {
    try {
      const { data: storeData } = await supabase
        .from("store_settings")
        .select("id")
        .single()

      if (!storeData?.id) {
        throw new Error("Store not found")
      }

      const { data } = await supabase
        .from("outlets")
        .select("*")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: false })

      setOutlets(data || [])

      // Set the main outlet as selected by default if no outlet is selected
      if (!selectedOutlet && data) {
        const mainOutlet = data.find((outlet) => outlet.is_main_outlet)
        if (mainOutlet) {
          setSelectedOutlet(mainOutlet)
        }
      }
    } catch (error) {
      console.error("Error fetching outlets:", error)
      setOutlets([])
    }
  }

  useEffect(() => {
    fetchOutlets()
  }, [])

  return (
    <OutletContext.Provider
      value={{
        outlets,
        selectedOutlet,
        setSelectedOutlet,
        fetchOutlets,
      }}
    >
      {children}
    </OutletContext.Provider>
  )
} 