import { useState, useEffect } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { toast } from "react-hot-toast"
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  UserRound
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useOutletContext } from "@/contexts/OutletContext"
import { DeliveryDetailsModal } from "./delivery-details-modal"

interface Delivery {
  id: string
  order_id: string
  outlet_id: string
  delivery_option_id: string
  status: 'pending' | 'processing' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'canceled'
  tracking_number: string
  delivery_address: string
  recipient_name: string
  recipient_phone: string
  driver_name: string | null
  driver_phone: string | null
  estimated_delivery_time: string
  current_location: any
  created_at: string
}

interface Order {
  id: string
  order_number: string
  total_amount: number
  created_at: string
}

interface DeliveryOption {
  id: string
  name: string
}

export const DeliveriesManagement = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("active")
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const supabase = useSupabaseClient()
  const { selectedOutlet } = useOutletContext()

  useEffect(() => {
    fetchDeliveries()
  }, [selectedOutlet, activeTab])

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true)
      
      let query = supabase
        .from("deliveries")
        .select(`
          *,
          orders:order_id (id, order_number, total_amount, created_at),
          delivery_options:delivery_option_id (id, name)
        `)
        .order("created_at", { ascending: false })
      
      // Filter by outlet if selected
      if (selectedOutlet) {
        query = query.eq("outlet_id", selectedOutlet.id)
      }
      
      // Filter by status based on active tab
      if (activeTab === "active") {
        query = query.in("status", ["pending", "processing", "picked_up", "in_transit"])
      } else if (activeTab === "completed") {
        query = query.eq("status", "delivered")
      } else if (activeTab === "issues") {
        query = query.in("status", ["failed", "canceled"])
      }
      
      const { data, error } = await query

      if (error) throw error
      
      // For demo purposes, since we don't have real data yet
      if (!data || data.length === 0) {
        setDeliveries(generateMockDeliveries(3, activeTab))
      } else {
        setDeliveries(data as Delivery[])
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error)
      toast.error("Failed to load deliveries")
      setDeliveries(generateMockDeliveries(3, activeTab))
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockDeliveries = (count: number, type: string) => {
    const statuses = {
      active: ["pending", "processing", "picked_up", "in_transit"],
      completed: ["delivered"],
      issues: ["failed", "canceled"]
    }
    
    const statusOptions = statuses[type as keyof typeof statuses] || statuses.active
    
    return Array.from({ length: count }).map((_, i) => ({
      id: `mock-${i}-${Date.now()}`,
      order_id: `order-${i}`,
      outlet_id: selectedOutlet?.id || "default-outlet",
      delivery_option_id: `option-${i % 3}`,
      status: statusOptions[Math.floor(Math.random() * statusOptions.length)] as Delivery["status"],
      tracking_number: `TRK${100000 + i}`,
      delivery_address: "123 Customer Street, City",
      recipient_name: "John Doe",
      recipient_phone: "+1 234 567 8900",
      driver_name: type === "active" ? "Alex Driver" : null,
      driver_phone: type === "active" ? "+1 987 654 3210" : null,
      estimated_delivery_time: new Date(Date.now() + 86400000 * (i + 1)).toISOString(),
      current_location: { lat: 0, lng: 0, address: "En route to destination" },
      created_at: new Date(Date.now() - 86400000 * i).toISOString(),
      orders: {
        id: `order-${i}`,
        order_number: `ORD-${10000 + i}`,
        total_amount: 75.50 + (i * 10),
        created_at: new Date(Date.now() - 86400000 * i).toISOString()
      },
      delivery_options: {
        id: `option-${i % 3}`,
        name: ["Standard Delivery", "Express Delivery", "Same Day Delivery"][i % 3]
      }
    }))
  }

  const handleViewDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery)
    setIsModalOpen(true)
  }

  const getStatusBadge = (status: Delivery["status"]) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="h-3 w-3 mr-1" /> },
      processing: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Package className="h-3 w-3 mr-1" /> },
      picked_up: { color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: <Truck className="h-3 w-3 mr-1" /> },
      in_transit: { color: "bg-purple-100 text-purple-800 border-purple-200", icon: <MapPin className="h-3 w-3 mr-1" /> },
      delivered: { color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      failed: { color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="h-3 w-3 mr-1" /> },
      canceled: { color: "bg-gray-100 text-gray-800 border-gray-200", icon: <AlertCircle className="h-3 w-3 mr-1" /> }
    }

    const config = statusConfig[status]
    
    return (
      <Badge variant="outline" className={`flex items-center ${config.color}`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </Badge>
    )
  }

  const getDeliveryProgress = (status: Delivery["status"]) => {
    const progressMap: Record<Delivery["status"], number> = {
      pending: 10,
      processing: 30,
      picked_up: 50,
      in_transit: 75,
      delivered: 100,
      failed: 100,
      canceled: 100
    }
    
    return progressMap[status] || 0
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric"
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Active Deliveries</h2>
          <p className="text-muted-foreground">
            Track and manage your deliveries
          </p>
        </div>
        <Button variant="outline" onClick={fetchDeliveries}>
          Refresh
        </Button>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4">
          {renderDeliveryCards()}
        </TabsContent>
        <TabsContent value="completed" className="space-y-4">
          {renderDeliveryCards()}
        </TabsContent>
        <TabsContent value="issues" className="space-y-4">
          {renderDeliveryCards()}
        </TabsContent>
      </Tabs>

      <DeliveryDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        delivery={selectedDelivery}
        onUpdate={fetchDeliveries}
      />
    </div>
  )

  function renderDeliveryCards() {
    if (isLoading) {
      return (
        <div className="flex justify-center my-10">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      )
    }

    if (deliveries.length === 0) {
      return (
        <div className="text-center p-10 border rounded-lg">
          <p className="text-muted-foreground">No deliveries found</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deliveries.map((delivery) => {
          const order = delivery.orders as unknown as Order
          const deliveryOption = delivery.delivery_options as unknown as DeliveryOption
          
          return (
            <Card key={delivery.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{order?.order_number || "Unknown"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {deliveryOption?.name || "Standard Delivery"}
                    </p>
                  </div>
                  {getStatusBadge(delivery.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Recipient</p>
                    <div className="flex items-center text-sm">
                      <UserRound className="h-4 w-4 mr-2 text-muted-foreground" />
                      {delivery.recipient_name}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Tracking #</p>
                    <p className="text-sm">{delivery.tracking_number}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Estimated Delivery</p>
                    <p className="text-sm">{formatDate(delivery.estimated_delivery_time)}</p>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Order Placed</span>
                      <span>Out for Delivery</span>
                      <span>Delivered</span>
                    </div>
                    <Progress value={getDeliveryProgress(delivery.status)} className="h-2" />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => handleViewDelivery(delivery)}
                    className="w-full mt-2"
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }
} 