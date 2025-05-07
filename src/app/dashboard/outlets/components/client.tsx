import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { OutletModal } from "./outlet-modal"

interface OutletClientProps {
  data: any[]
}

export const OutletClient: React.FC<OutletClientProps> = ({
  data
}) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Outlets (${data.length})`}
          description="Manage outlets for your store"
        />
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <OutletModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false)
          navigate(0) // This will refresh the current route
        }}
      />
    </>
  )
} 