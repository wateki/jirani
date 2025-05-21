import { useState, useEffect } from "react"
import { Store, PlusCircle, Loader2, RefreshCw } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OutletModal } from "./outlet-modal"
import { Button } from "@/components/ui/button"
import { useOutletContext } from "@/contexts/OutletContext"
import { useToast } from "@/hooks/use-toast"

// Define the Outlet type
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

export const OutletManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOutletForEdit, setSelectedOutletForEdit] = useState<Outlet | null>(null)
  const { outlets, fetchOutlets, isLoading } = useOutletContext()
  const { toast } = useToast()
  const [localLoading, setLocalLoading] = useState(false)

  // Force refresh of outlets on component mount
  useEffect(() => {
    console.log("OutletManagement mounted - fetching outlets")
    refreshOutletsList()
  }, [])

  // Debug: Log outlets changes
  useEffect(() => {
    console.log("OutletManagement received outlets update:", outlets.length, outlets)
  }, [outlets])

  const refreshOutletsList = async () => {
    setLocalLoading(true)
    try {
      console.log("Manual refresh of outlets requested")
      await fetchOutlets()
      toast({
        title: "Success",
        description: "Outlets list refreshed"
      })
    } catch (error) {
      console.error("Error refreshing outlets:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh outlets list"
      })
    } finally {
      setLocalLoading(false)
    }
  }

  const handleAddOutlet = () => {
    setSelectedOutletForEdit(null)
    setIsModalOpen(true)
  }

  const handleEditOutlet = (outlet: Outlet) => {
    console.log("Selected outlet for editing:", outlet)
    setSelectedOutletForEdit(outlet)
    // Small delay to ensure state is set before opening modal
    setTimeout(() => {
    setIsModalOpen(true)
    }, 50)
  }
  
  const handleConfirm = async () => {
    setIsModalOpen(false)
    setSelectedOutletForEdit(null)
    // Wait briefly before fetching to give the database time to update
    setTimeout(() => {
      console.log("Modal confirmed, refreshing outlets")
      refreshOutletsList()
    }, 500)
  }

  // Combine local and context loading states
  const showLoading = isLoading || localLoading

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Outlet Management</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={refreshOutletsList} 
            disabled={showLoading}
            size="sm"
            className="text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <RefreshCw className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 ${showLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleAddOutlet}
            size="sm"
            className="text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <PlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Add New Outlet
          </Button>
        </div>
      </div>

      {/* Debug info - number of outlets */}
      <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground">
        {outlets.length} outlet{outlets.length !== 1 ? 's' : ''} found
      </div>

      {showLoading ? (
        <div className="flex justify-center items-center p-6 sm:p-12">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
          <span className="ml-2 text-sm sm:text-base">Loading outlets...</span>
        </div>
      ) : outlets.length === 0 ? (
        <div className="text-center p-6 sm:p-12 border rounded-lg bg-slate-50">
          <Store className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-400" />
          <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium">No outlets found</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-500">
            You haven't created any outlets yet. Create your first outlet to get started.
          </p>
          <Button className="mt-3 sm:mt-4 text-xs sm:text-sm" onClick={handleAddOutlet}>
            <PlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Create First Outlet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {outlets.map((outlet: Outlet) => (
            <Card key={outlet.id} className="relative overflow-hidden">
                {outlet.is_main_outlet && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-1 text-xs">
                    Main Outlet
                </div>
                )}
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                  {outlet.name}
              </CardTitle>
            </CardHeader>
              
              <CardContent className="p-3 pb-5 sm:p-6">
              <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    <strong>Address:</strong> {outlet.address || "N/A"}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    <strong>Phone:</strong> {outlet.phone || "N/A"}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    <strong>Email:</strong> {outlet.email || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ID: {outlet.id.substring(0, 8)}...
                  </p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                    className="text-xs sm:text-sm w-full sm:w-auto"
                  onClick={() => handleEditOutlet(outlet)}
                >
                  Edit Outlet
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      <OutletModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedOutletForEdit(null)
        }}
        onConfirm={handleConfirm}
        initialData={selectedOutletForEdit}
      />
    </div>
  )
} 