import { Card, CardContent } from "@/components/ui/card";

interface OverviewCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}

export const OverviewCard = ({ icon, title, value, description }: OverviewCardProps) => {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-3 flex items-center">
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <div className="text-blue-600">{icon}</div>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 sm:text-base">{title}</h4>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-2xl font-bold text-gray-900 sm:text-3xl">{value}</div>
          <p className="text-sm leading-relaxed text-gray-600">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};
