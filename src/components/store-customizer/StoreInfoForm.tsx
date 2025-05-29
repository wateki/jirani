import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import getEnvironmentConfig from "../../config/environment";

interface StoreInfoFormProps {
  storeInfo: {
    name: string;
    description: string;
  };
  derivedStoreSlug: string;
  isPublished: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const StoreInfoForm = ({
  storeInfo,
  derivedStoreSlug,
  isPublished,
  onChange,
}: StoreInfoFormProps) => {
  return (
    <div className="mb-8 rounded-lg border bg-white p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Basic Store Information</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                name="name"
                value={storeInfo.name}
                onChange={onChange}
                placeholder="Enter your store name"
                required
              />
              <p className="text-xs text-gray-500">
                This name will be displayed as your store brand and used to create your unique store
                URL.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Store Description</Label>
              <Textarea
                id="description"
                name="description"
                value={storeInfo.description}
                onChange={onChange}
                placeholder="Brief description of your store"
                className="min-h-[80px]"
              />
              <p className="text-xs text-gray-500">
                A short description to help customers understand what your store offers.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h2 className="mb-4 text-lg font-semibold">Store URL Preview</h2>

          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Your Store's URL</Label>
              <div className="rounded border bg-white p-3 font-mono text-sm">
                {derivedStoreSlug ? (
                  <>
                    {getEnvironmentConfig().useQueryParamRouting ? (
                      // Show query parameter format for Vercel/localhost
                      <>
                        <span className="text-gray-600">{window.location.origin}?store=</span>
                        <span className="text-purple-600">{derivedStoreSlug}</span>
                      </>
                    ) : (
                      // Show subdomain format for custom domains
                      <>
                        <span className="text-purple-600">{derivedStoreSlug}</span>
                        <span className="text-gray-600">.yourdomain.com</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="italic text-gray-400">Enter a store name to generate URL</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This is the web address where customers will access your store.
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Publication Status</Label>
              <div className="flex items-center space-x-2">
                <div
                  className={`h-3 w-3 rounded-full ${isPublished ? "bg-green-500" : "bg-yellow-500"}`}
                ></div>
                <span className="text-sm font-medium">{isPublished ? "Published" : "Draft"}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {isPublished
                  ? "Your store is live and accessible to customers."
                  : "Your store is in draft mode and not visible to customers yet."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
