import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getButtonStyles } from "./utils";

interface ColorStyleFormProps {
  storeInfo: {
    primaryColor: string;
    secondaryColor: string;
    heroHeading: string;
    heroSubheading: string;
    buttonStyle: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onButtonStyleChange: (value: string) => void;
}

export const ColorStyleForm = ({
  storeInfo,
  onChange,
  onButtonStyleChange,
}: ColorStyleFormProps) => {
  const buttonStyles = [
    { value: "contained", label: "Contained", description: "Solid background button" },
    {
      value: "outlined",
      label: "Outlined",
      description: "Border button with transparent background",
    },
    { value: "zig-zag", label: "Zig-Zag", description: "Dashed border with playful style" },
  ];

  return (
    <div className="mb-8 rounded-lg border bg-white p-6">
      <h2 className="mb-6 text-lg font-semibold">Colors & Style</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Color Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center space-x-3">
              <Input
                id="primaryColor"
                name="primaryColor"
                type="color"
                value={storeInfo.primaryColor}
                onChange={onChange}
                className="h-12 w-20 cursor-pointer border-0 p-1"
              />
              <Input
                name="primaryColor"
                value={storeInfo.primaryColor}
                onChange={onChange}
                placeholder="#000000"
                className="flex-1 font-mono"
              />
            </div>
            <p className="text-xs text-gray-500">
              Used for headings, main call-to-action buttons, and brand elements.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex items-center space-x-3">
              <Input
                id="secondaryColor"
                name="secondaryColor"
                type="color"
                value={storeInfo.secondaryColor}
                onChange={onChange}
                className="h-12 w-20 cursor-pointer border-0 p-1"
              />
              <Input
                name="secondaryColor"
                value={storeInfo.secondaryColor}
                onChange={onChange}
                placeholder="#000000"
                className="flex-1 font-mono"
              />
            </div>
            <p className="text-xs text-gray-500">
              Used for accents, secondary buttons, and supporting elements.
            </p>
          </div>
        </div>

        {/* Button Style Settings */}
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Button Style</Label>
            <div className="space-y-3">
              {buttonStyles.map((style) => (
                <div
                  key={style.value}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    storeInfo.buttonStyle === style.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => onButtonStyleChange(style.value)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{style.label}</div>
                      <div className="text-xs text-gray-500">{style.description}</div>
                    </div>
                    <Button
                      size="sm"
                      className={getButtonStyles(style.value, storeInfo.primaryColor)}
                      type="button"
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Choose the button style that best matches your brand aesthetic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
