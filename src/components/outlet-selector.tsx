import { Store, Home } from "lucide-react"
import { useOutletContext } from "@/contexts/OutletContext"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"

export function OutletSelector() {
  const { selectedOutlet, setSelectedOutlet, outlets } = useOutletContext()

  return (
    <Select
      value={selectedOutlet?.id || "all-outlets"}
      onValueChange={(value) => {
        if (value === "all-outlets") {
          setSelectedOutlet(null)
        } else {
        const outlet = outlets.find((o) => o.id === value)
        setSelectedOutlet(outlet || null)
        }
      }}
    >
      <SelectTrigger className="w-full bg-background border-none focus:ring-0 focus:ring-offset-0">
        <div className="flex items-center gap-2">
          {selectedOutlet ? (
          <Store className="h-4 w-4" />
          ) : (
            <Home className="h-4 w-4" />
          )}
          <SelectValue placeholder="Select outlet">
            {selectedOutlet?.name || "All Outlets"}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all-outlets">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>All Outlets</span>
            </div>
          </SelectItem>
          
          {outlets.length > 0 && <SelectSeparator />}
          
        {outlets.length === 0 ? (
          <SelectItem value="no-outlets" disabled>
            No outlets available
          </SelectItem>
        ) : (
            <SelectGroup>
              <SelectLabel>Available Outlets</SelectLabel>
              {outlets.map((outlet) => (
            <SelectItem key={outlet.id} value={outlet.id}>
              <div className="flex items-center justify-between w-full">
                <span>{outlet.name}</span>
                {outlet.is_main_outlet && (
                  <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Main
                  </span>
                )}
              </div>
            </SelectItem>
              ))}
            </SelectGroup>
        )}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
} 