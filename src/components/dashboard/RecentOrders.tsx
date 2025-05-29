import { ArrowRight, Package } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Order {
  id: string;
  items_count?: number;
  total?: number;
  customer_name?: string;
  created_at: string;
}

interface RecentOrdersProps {
  orders: Order[];
  isLoading: boolean;
  pendingOrdersCount: number;
}

export const RecentOrders = ({ orders, isLoading, pendingOrdersCount }: RecentOrdersProps) => {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>
          {isLoading
            ? "Loading orders..."
            : pendingOrdersCount > 0
              ? `You have ${pendingOrdersCount} pending orders.`
              : "No pending orders."}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-3 sm:p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {orders.map((order, i) => (
              <div
                key={order.id}
                className="flex flex-col justify-between rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center sm:p-4"
              >
                <div className="mb-2 flex items-center sm:mb-0">
                  <div className="mr-3 rounded-lg bg-white p-2 shadow-sm sm:mr-4 sm:p-3">
                    <Package className="h-5 w-5 text-gray-500 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium sm:text-base">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500 sm:text-sm">
                      {order.items_count || 2} items • KSh {(order.total || 89.99).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between sm:w-auto sm:justify-end">
                  <div className="text-left sm:mr-4 sm:text-right">
                    <p className="text-xs font-medium sm:text-sm">
                      {order.customer_name || `Customer ${i + 1}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild className="ml-2 sm:ml-0">
                    <Link to={`/dashboard/orders/${order.id}`}>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center sm:py-8">
            <p className="text-sm text-gray-500 sm:text-base">No orders found for this outlet.</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end p-3 sm:p-6">
        <Button size="sm" className="text-xs sm:text-sm" variant="outline" asChild>
          <Link to="/dashboard/orders">View All Orders</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
