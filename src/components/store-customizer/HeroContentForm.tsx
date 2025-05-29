import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface HeroContentFormProps {
  storeInfo: {
    heroHeading: string;
    heroSubheading: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const HeroContentForm = ({ storeInfo, onChange }: HeroContentFormProps) => {
  return (
    <div className="mb-8 rounded-lg border bg-white p-6">
      <h2 className="mb-6 text-lg font-semibold">Hero Section Content</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="heroHeading">Main Heading</Label>
          <Input
            id="heroHeading"
            name="heroHeading"
            value={storeInfo.heroHeading}
            onChange={onChange}
            placeholder="Enter compelling headline"
            className="text-lg"
          />
          <p className="text-xs text-gray-500">
            The main headline that visitors see first. Make it compelling and clear about what you
            offer.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="heroSubheading">Subheading</Label>
          <Textarea
            id="heroSubheading"
            name="heroSubheading"
            value={storeInfo.heroSubheading}
            onChange={onChange}
            placeholder="Provide more details about your store"
            className="min-h-[100px]"
          />
          <p className="text-xs text-gray-500">
            Supporting text that provides more details about your products or services. Keep it
            engaging and informative.
          </p>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start space-x-2">
            <div className="text-yellow-600">💡</div>
            <div className="text-sm">
              <div className="mb-1 font-medium text-yellow-800">Pro Tip</div>
              <div className="text-yellow-700">
                Use action-oriented language in your heading and focus on the benefits your
                customers will receive. Keep headings under 60 characters for maximum impact.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
