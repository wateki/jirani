import { Card, CardContent } from "@/components/ui/card";

import type { ChangeMetric } from "./types";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  description: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

export const StatCard = ({
  label,
  value,
  change,
  trend,
  description,
  icon,
  isLoading = false,
}: StatCardProps) => {
  if (isLoading) {
    return (
      <Card className="h-32">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-20 rounded bg-gray-200"></div>
            <div className="h-8 w-24 rounded bg-gray-200"></div>
            <div className="h-3 w-16 rounded bg-gray-200"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendColor = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return "↗";
      case "down":
        return "↘";
      default:
        return "→";
    }
  };

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">{label}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
            {icon}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900 sm:text-3xl">{value}</div>

          <div className="flex items-center justify-between">
            <span className={`flex items-center text-sm font-medium ${getTrendColor(trend)}`}>
              <span className="mr-1">{getTrendIcon(trend)}</span>
              {change}
            </span>
            <span className="text-xs text-gray-500">{description}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
