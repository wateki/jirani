import { useState } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "react-hot-toast"

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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

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

interface DeliveryOptionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  initialData?: DeliveryOption | null
}

const deliveryOptionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  estimated_time: z.string().min(1, "Please provide an estimated delivery time"),
  is_active: z.boolean().default(true),
})

type DeliveryOptionFormValues = z.infer<typeof deliveryOptionSchema>

export const DeliveryOptionModal: React.FC<DeliveryOptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialData,
}) => {
  const [loading, setLoading] = useState(false)
  const supabase = useSupabaseClient()

  const form = useForm<DeliveryOptionFormValues>({
    resolver: zodResolver(deliveryOptionSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      estimated_time: initialData?.estimated_time || "",
      is_active: initialData?.is_active ?? true,
    },
  })

  const onSubmit = async (data: DeliveryOptionFormValues) => {
    try {
      setLoading(true)

      const { data: storeData } = await supabase
        .from("store_settings")
        .select("id")
        .single()

      if (!storeData?.id) {
        throw new Error("Store not found")
      }

      if (initialData) {
        // Update existing option
        const { error } = await supabase
          .from("delivery_options")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id)

        if (error) throw error
        toast.success("Delivery option updated")
      } else {
        // Create new option
        const { error } = await supabase
          .from("delivery_options")
          .insert({
            ...data,
            store_id: storeData.id,
          })

        if (error) throw error
        toast.success("Delivery option created")
      }

      onConfirm()
    } catch (error) {
      console.error("Error saving delivery option:", error)
      toast.error("Failed to save delivery option")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Delivery Option" : "Add Delivery Option"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update your delivery option details"
              : "Add a new delivery option for your customers"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="e.g. Standard Delivery"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="Describe this delivery option"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex space-x-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input
                          type="number"
                          disabled={loading}
                          min={0}
                          step={0.01}
                          className="pl-7"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="estimated_time"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Estimated Time</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="e.g. 1-2 days"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      This option will be available for customers to select
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                disabled={loading}
                variant="outline"
                onClick={onClose}
                type="button"
              >
                Cancel
              </Button>
              <Button disabled={loading} type="submit">
                {initialData ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 