import { useState } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useForm } from "react-hook-form"
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

  const form = useForm<OutletFormValues>({
    defaultValues: {
      name: initialData?.name || "",
      address: initialData?.address || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      is_main_outlet: initialData?.is_main_outlet || false,
    },
  })

  const onSubmit = async (data: OutletFormValues) => {
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
        await supabase
          .from("outlets")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id)
      } else {
        await supabase.from("outlets").insert({
          ...data,
          store_id: storeData.id,
        })
      }

      toast.success(initialData ? "Outlet updated." : "Outlet created.")
      onConfirm()
    } catch (error) {
      toast.error("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit outlet" : "Create outlet"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Edit your outlet details"
              : "Add a new outlet to your store"}
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
                      placeholder="Outlet name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Outlet address"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Phone number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Email address"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_main_outlet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Main Outlet</FormLabel>
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