import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeliveryOptionsManagement } from "./delivery-options"
import { DeliveriesManagement } from "./deliveries-management"

export const DeliveriesClient = () => {
  const [activeTab, setActiveTab] = useState("deliveries")

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Deliveries Management</h1>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="deliveries">Active Deliveries</TabsTrigger>
          <TabsTrigger value="options">Delivery Options</TabsTrigger>
        </TabsList>
        <TabsContent value="deliveries" className="space-y-4">
          <DeliveriesManagement />
        </TabsContent>
        <TabsContent value="options" className="space-y-4">
          <DeliveryOptionsManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
} 