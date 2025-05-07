import { useState } from "react"
import { Store } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OutletModal } from "./outlet-modal"
import { Button } from "@/components/ui/button"
import { useOutletContext } from "@/contexts/OutletContext"

export const OutletManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOutletForEdit, setSelectedOutletForEdit] = useState(null)
  const { outlets, fetchOutlets } = useOutletContext()

  const handleAddOutlet = () => {
    setSelectedOutletForEdit(null)
    setIsModalOpen(true)
  }

  const handleEditOutlet = (outlet: any) => {
    setSelectedOutletForEdit(outlet)
    setIsModalOpen(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Outlet Management</h2>
        <Button onClick={handleAddOutlet}>Add New Outlet</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {outlets.map((outlet: any) => (
          <Card key={outlet.id} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                {outlet.name}
                {outlet.is_main_outlet && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                    Main Outlet
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{outlet.address}</p>
                <p className="text-sm text-muted-foreground">{outlet.phone}</p>
                <p className="text-sm text-muted-foreground">{outlet.email}</p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditOutlet(outlet)}
                >
                  Edit Outlet
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <OutletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          setIsModalOpen(false)
          fetchOutlets()
        }}
        initialData={selectedOutletForEdit}
      />
    </div>
  )
} 