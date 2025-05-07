import { useState, useEffect } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { Plus, Edit, Trash } from "lucide-react"
import { toast } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { useOutletContext } from "@/contexts/OutletContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DeliveryOptionModal } from "./delivery-option-modal"

interface DeliveryOption {
  id: string
  store_id: string
  name: string
  description: string
  price: number
  estimated_time: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const DeliveryOptionsManagement = () => {
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<DeliveryOption | null>(null)
  const supabase = useSupabaseClient()
  const { selectedOutlet } = useOutletContext()

  useEffect(() => {
    fetchDeliveryOptions()
  }, [selectedOutlet])

  const fetchDeliveryOptions = async () => {
    try {
      setIsLoading(true)
      
      const { data: storeData } = await supabase
        .from("store_settings")
        .select("id")
        .single()

      if (!storeData?.id) {
        throw new Error("Store not found")
      }

      const { data, error } = await supabase
        .from("delivery_options")
        .select("*")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      
      setDeliveryOptions(data || [])
    } catch (error) {
      console.error("Error fetching delivery options:", error)
      toast.error("Failed to load delivery options")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddOption = () => {
    setSelectedOption(null)
    setIsModalOpen(true)
  }

  const handleEditOption = (option: DeliveryOption) => {
    setSelectedOption(option)
    setIsModalOpen(true)
  }

  const handleDeleteOption = async (id: string) => {
    try {
      const { error } = await supabase
        .from("delivery_options")
        .delete()
        .eq("id", id)

      if (error) throw error

      setDeliveryOptions(prev => prev.filter(option => option.id !== id))
      toast.success("Delivery option deleted successfully")
    } catch (error) {
      console.error("Error deleting delivery option:", error)
      toast.error("Failed to delete delivery option")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Delivery Options</h2>
          <p className="text-muted-foreground">
            Manage delivery options available to your customers
          </p>
        </div>
        <Button onClick={handleAddOption}>
          <Plus className="mr-2 h-4 w-4" />
          Add Option
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-10">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : deliveryOptions.length === 0 ? (
        <div className="text-center p-10 border rounded-lg">
          <p className="text-muted-foreground">No delivery options found</p>
          <Button variant="outline" onClick={handleAddOption} className="mt-4">
            Add your first delivery option
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliveryOptions.map((option) => (
            <Card key={option.id} className={!option.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle>{option.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditOption(option)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteOption(option.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{option.estimated_time}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{option.description}</p>
                  <p className="text-lg font-semibold">{formatPrice(option.price)}</p>
                  {!option.is_active && (
                    <p className="text-xs text-muted-foreground">Inactive</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeliveryOptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          setIsModalOpen(false)
          fetchDeliveryOptions()
        }}
        initialData={selectedOption}
      />
    </div>
  )
} 