import { useState, useEffect } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { getUserStoreId } from "@/utils/store"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

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

interface OutletFormValues {
  name: string
  address: string
  phone: string
  email: string
  is_main_outlet: boolean
}

interface OutletModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  initialData?: Outlet | null
}

export const OutletModal: React.FC<OutletModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialData,
}) => {
  const [loading, setLoading] = useState(false)
  const supabase = useSupabaseClient()
  const [storeId, setStoreId] = useState<string | null>(null)

  // Setup form
  const form = useForm<OutletFormValues>({
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      is_main_outlet: false,
    },
  })

  // Reset form when initialData changes or modal opens
  useEffect(() => {
    if (isOpen) {
      // Log what we're doing for debugging
      console.log("Modal opened, initialData:", initialData)
      
      if (initialData) {
        console.log("Setting form values from initialData:", {
          name: initialData.name,
          address: initialData.address || "",
          phone: initialData.phone || "",
          email: initialData.email || "",
          is_main_outlet: initialData.is_main_outlet || false,
        })
        
        // Reset the form with the initialData values
        form.reset({
          name: initialData.name,
          address: initialData.address || "",
          phone: initialData.phone || "",
          email: initialData.email || "",
          is_main_outlet: initialData.is_main_outlet || false,
        })
      } else {
        console.log("Resetting form to empty values for new outlet")
        // Reset to empty values for a new outlet
        form.reset({
          name: "",
          address: "",
          phone: "",
          email: "",
          is_main_outlet: false,
  })
      }
    }
  }, [isOpen, initialData, form])

  // Fetch store ID when modal opens
  useEffect(() => {
    const getStoreId = async () => {
      if (isOpen) {
        try {
          const id = await getUserStoreId()
          console.log("Modal got store ID:", id)
          setStoreId(id)
        } catch (error) {
          console.error("Error getting store ID in modal:", error)
          toast.error("Could not retrieve store information")
        }
      }
    }
    
    getStoreId()
  }, [isOpen])

  const onSubmit = async (data: OutletFormValues) => {
    try {
      setLoading(true)
      console.log("Submitting outlet form with data:", data)

      // Verify we have a store ID
      if (!storeId) {
        const freshStoreId = await getUserStoreId()
        if (!freshStoreId) {
          throw new Error("Store not found. Please try again or contact support.")
        }
        setStoreId(freshStoreId)
        console.log("Retrieved fresh store ID:", freshStoreId)
      }
      
      const currentStoreId = storeId
      console.log("Using store ID for outlet:", currentStoreId)

      if (initialData) {
        // Update existing outlet
        console.log("Updating outlet:", initialData.id)
        const { error: updateError } = await supabase
          .from("outlets")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id)
          
        if (updateError) {
          console.error("Error updating outlet:", updateError)
          throw updateError
        }
        
        console.log("Outlet updated successfully")
      } else {
        // Create new outlet
        console.log("Creating new outlet for store:", currentStoreId)
        const newOutlet = {
          ...data,
          store_id: currentStoreId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        
        console.log("New outlet data:", newOutlet)
        
        const { data: createdOutlet, error: insertError } = await supabase
          .from("outlets")
          .insert(newOutlet)
          .select()
        
        if (insertError) {
          console.error("Error creating outlet:", insertError)
          throw insertError
        }
        
        console.log("Outlet created successfully:", createdOutlet)
      }

      toast.success(initialData ? "Outlet updated." : "Outlet created.")
      onConfirm()
    } catch (error: any) {
      console.error("Error in outlet operation:", error)
      toast.error(error.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="px-2 sm:px-6 pt-2 sm:pt-6">
          <DialogTitle className="text-lg sm:text-xl">
            {initialData ? "Edit outlet" : "Create outlet"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {initialData
              ? "Edit your outlet details"
              : "Add a new outlet to your store"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4 px-2 sm:px-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Name</FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs sm:text-sm h-8 sm:h-10"
                      disabled={loading}
                      placeholder="Outlet name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Address</FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs sm:text-sm h-8 sm:h-10"
                      disabled={loading}
                      placeholder="Outlet address"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Phone</FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs sm:text-sm h-8 sm:h-10"
                      disabled={loading}
                      placeholder="Phone number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Email</FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs sm:text-sm h-8 sm:h-10"
                      disabled={loading}
                      placeholder="Email address"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_main_outlet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 sm:p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs sm:text-sm">Main Outlet</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter className="sm:px-0 pb-2 sm:pb-0 flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                disabled={loading}
                variant="outline"
                onClick={onClose}
                type="button"
                className="w-full sm:w-auto order-2 sm:order-1 text-xs sm:text-sm h-8 sm:h-10"
              >
                Cancel
              </Button>
              <Button 
                disabled={loading} 
                type="submit"
                className="w-full sm:w-auto order-1 sm:order-2 text-xs sm:text-sm h-8 sm:h-10"
              >
                {initialData ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 