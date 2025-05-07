import { useState } from "react"
import { useOutletContext } from "@/contexts/OutletContext"
import { Plus, Edit, Trash } from "lucide-react"
import { toast } from "react-hot-toast"
import { useSupabaseClient } from "@supabase/auth-helpers-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OutletModal } from "./outlet-modal"

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

export const OutletList = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const { outlets, fetchOutlets } = useOutletContext()
  const supabase = useSupabaseClient()

  const onDelete = async (id: string) => {
    try {
      setIsLoading(true)
      await supabase.from("outlets").delete().eq("id", id)
      await fetchOutlets()
      toast.success("Outlet deleted.")
    } catch (error) {
      toast.error("Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  const onEdit = (outlet: Outlet) => {
    setSelectedOutlet(outlet)
    setIsModalOpen(true)
  }

  const onAdd = () => {
    setSelectedOutlet(null)
    setIsModalOpen(true)
  }

  const onModalClose = () => {
    setSelectedOutlet(null)
    setIsModalOpen(false)
  }

  const onModalConfirm = async () => {
    await fetchOutlets()
    onModalClose()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Outlets</h2>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Main Outlet</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {outlets.map((outlet) => (
            <TableRow key={outlet.id}>
              <TableCell>{outlet.name}</TableCell>
              <TableCell>{outlet.address}</TableCell>
              <TableCell>{outlet.phone}</TableCell>
              <TableCell>{outlet.email}</TableCell>
              <TableCell>
                {outlet.is_main_outlet ? "Yes" : "No"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-x-2">
                  <Button
                    onClick={() => onEdit(outlet)}
                    variant="outline"
                    size="icon"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => onDelete(outlet.id)}
                    variant="destructive"
                    size="icon"
                    disabled={isLoading}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <OutletModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        onConfirm={onModalConfirm}
        initialData={selectedOutlet}
      />
    </div>
  )
} 