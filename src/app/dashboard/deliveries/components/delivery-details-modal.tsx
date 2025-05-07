import { useState } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { toast } from "react-hot-toast"
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  User,
  Phone,
  MapPinned,
  Calendar
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  delivery_timeline?: any[]
}

interface DeliveryDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  delivery: Delivery | null
  onUpdate: () => void
}

export const DeliveryDetailsModal = ({
  isOpen,
  onClose,
  delivery,
  onUpdate
}: DeliveryDetailsModalProps) => {
  const [status, setStatus] = useState<string>("")
  const [driverInfo, setDriverInfo] = useState({
    name: "",
    phone: ""
  })
  const [loading, setLoading] = useState(false)
  const supabase = useSupabaseClient()

  // Update local state when delivery changes
  useState(() => {
    if (delivery) {
      setStatus(delivery.status)
      setDriverInfo({
        name: delivery.driver_name || "",
        phone: delivery.driver_phone || ""
      })
    }
  })

  const handleUpdateDelivery = async () => {
    if (!delivery) return

    try {
      setLoading(true)

      // Create a status update for the timeline
      const timelineEntry = {
        status,
        timestamp: new Date().toISOString(),
        comments: `Status updated to ${status}`,
        updateBy: "Store Staff"
      }

      // In a real implementation, we would update the database
      // For now, we'll just simulate success
      const mockSuccess = true

      if (mockSuccess) {
        toast.success("Delivery status updated")
        onUpdate()
        onClose()
      } else {
        toast.error("Failed to update delivery status")
      }
    } catch (error) {
      console.error("Error updating delivery:", error)
      toast.error("An error occurred while updating the delivery")
    } finally {
      setLoading(false)
    }
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

  const getStatusIcon = (status: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      pending: <Clock className="h-5 w-5" />,
      processing: <Package className="h-5 w-5" />,
      picked_up: <Truck className="h-5 w-5" />,
      in_transit: <MapPin className="h-5 w-5" />,
      delivered: <CheckCircle2 className="h-5 w-5" />,
      failed: <XCircle className="h-5 w-5" />,
      canceled: <XCircle className="h-5 w-5" />
    }
    
    return iconMap[status] || <Clock className="h-5 w-5" />
  }

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200",
      picked_up: "bg-indigo-100 text-indigo-800 border-indigo-200",
      in_transit: "bg-purple-100 text-purple-800 border-purple-200",
      delivered: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      canceled: "bg-gray-100 text-gray-800 border-gray-200"
    }
    
    return (
      <Badge variant="outline" className={`${colorMap[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </Badge>
    )
  }

  // Mock delivery timeline for demo
  const generateMockTimeline = () => {
    const statusOptions = ['Order Placed', 'Processing', 'Picked Up', 'In Transit', 'Delivered']
    const currentIndex = delivery?.status === 'delivered' ? 4 : 
                        delivery?.status === 'in_transit' ? 3 :
                        delivery?.status === 'picked_up' ? 2 :
                        delivery?.status === 'processing' ? 1 : 0
    
    return statusOptions.slice(0, currentIndex + 1).map((status, index) => ({
      status,
      timestamp: new Date(Date.now() - (86400000 * (statusOptions.length - index))).toISOString(),
      comments: `Package ${status.toLowerCase()}`,
      updatedBy: "System"
    }))
  }

  if (!delivery) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Delivery Details</DialogTitle>
          <DialogDescription>
            View and update delivery information
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Tracking Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Tracking Number</h3>
                <p className="text-sm">{delivery.tracking_number}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Status</h3>
                {getStatusBadge(delivery.status)}
              </div>
            </div>
            
            <Separator />
            
            {/* Order Info */}
            <div>
              <h3 className="text-sm font-medium mb-3">Order Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Order ID</Label>
                  <p className="text-sm">#{delivery.order_id}</p>
                </div>
                <div>
                  <Label className="text-xs">Order Date</Label>
                  <p className="text-sm">{formatDate(delivery.created_at)}</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Delivery Info */}
            <div>
              <h3 className="text-sm font-medium mb-3">Delivery Information</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <MapPinned className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs">Delivery Address</Label>
                    <p className="text-sm">{delivery.delivery_address}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <User className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs">Recipient</Label>
                    <p className="text-sm">{delivery.recipient_name}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Phone className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs">Contact</Label>
                    <p className="text-sm">{delivery.recipient_phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs">Estimated Delivery</Label>
                    <p className="text-sm">{formatDate(delivery.estimated_delivery_time)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Driver Info */}
            <div>
              <h3 className="text-sm font-medium mb-3">Driver Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="driver_name" className="text-xs">Driver Name</Label>
                  <Input 
                    id="driver_name"
                    value={driverInfo.name}
                    onChange={(e) => setDriverInfo({...driverInfo, name: e.target.value})}
                    placeholder="Driver name"
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="driver_phone" className="text-xs">Driver Phone</Label>
                  <Input 
                    id="driver_phone"
                    value={driverInfo.phone}
                    onChange={(e) => setDriverInfo({...driverInfo, phone: e.target.value})}
                    placeholder="Phone number"
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Status Update */}
            <div>
              <h3 className="text-sm font-medium mb-3">Update Status</h3>
              <Select 
                value={status} 
                onValueChange={setStatus}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            {/* Delivery Timeline */}
            <div>
              <h3 className="text-sm font-medium mb-3">Delivery Timeline</h3>
              <div className="space-y-3">
                {generateMockTimeline().map((event, index) => (
                  <Card key={index} className="border-l-4 border-primary">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          {getStatusIcon(event.status.toLowerCase().replace(" ", "_"))}
                          <div className="ml-2">
                            <p className="text-sm font-medium">{event.status}</p>
                            <p className="text-xs text-muted-foreground">{event.comments}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 mt-4 border-t sticky bottom-0 bg-background">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateDelivery}
            disabled={loading || !status}
          >
            {loading ? "Updating..." : "Update Delivery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 