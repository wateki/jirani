import { Image as ImageIcon, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImageUploadFormProps {
  coverImage: string | null;
  logoImage: string | null;
  onCoverImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImageUploadForm = ({
  coverImage,
  logoImage,
  onCoverImageUpload,
  onLogoImageUpload,
}: ImageUploadFormProps) => {
  const clearCoverImage = () => {
    // Clear the cover image state (would need to be passed as prop)
    // For now, this is a placeholder
  };

  const clearLogoImage = () => {
    // Clear the logo image state (would need to be passed as prop)
    // For now, this is a placeholder
  };

  return (
    <div className="mb-8 rounded-lg border bg-white p-6">
      <h2 className="mb-6 text-lg font-semibold">Store Images</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Logo Upload */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Store Logo</Label>
            <div className="relative">
              {logoImage ? (
                <div className="relative">
                  <img
                    src={logoImage}
                    alt="Store Logo"
                    className="h-32 w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 object-contain p-4"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute right-2 top-2"
                    onClick={clearLogoImage}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                  <span className="mt-2 text-sm text-gray-500">Upload Logo</span>
                  <span className="text-xs text-gray-400">PNG, JPG up to 2MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onLogoImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Square logo works best. Will be displayed in the header and on store pages.
            </p>
          </div>
        </div>

        {/* Cover Image Upload */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Hero Background Image</Label>
            <div className="relative">
              {coverImage ? (
                <div className="relative">
                  <img
                    src={coverImage}
                    alt="Cover"
                    className="h-32 w-full rounded-lg border-2 border-dashed border-gray-300 object-cover"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute right-2 top-2"
                    onClick={clearCoverImage}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="mt-2 text-sm text-gray-500">Upload Background</span>
                  <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onCoverImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500">
              High-quality image for hero section background. Landscape orientation recommended.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start space-x-2">
          <div className="text-blue-600">ℹ️</div>
          <div className="text-sm">
            <div className="mb-1 font-medium text-blue-800">Image Guidelines</div>
            <ul className="space-y-1 text-blue-700">
              <li>• Use high-resolution images for better quality</li>
              <li>• Logo: Square format (1:1 ratio) works best</li>
              <li>• Background: Landscape format (16:9 or 3:2 ratio) recommended</li>
              <li>• Consider how text will overlay on background images</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
