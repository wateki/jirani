import OrderManagement from "@/components/store/OrderManagement";
import DashboardLayout from "@/layouts/DashboardLayout";

function OrdersPage() {
  return (
    <DashboardLayout>
      <OrderManagement />
    </DashboardLayout>
  );
}

export default OrdersPage; 