import OrderManagement from "@/components/store/OrderManagement";
import PayoutsManagement from "@/components/store/PayoutsManagement";
import { OutletManagement } from "@/app/dashboard/outlets/components/outlet-management";
import DeliveriesPage from "@/app/dashboard/deliveries/page";
import WhatsappInbox from "@/app/dashboard/whatsapp/Inbox";
import WhatsAppAnalytics from "@/app/dashboard/whatsapp/Analytics";
import POSSystem from "@/components/store/POSSystem";

export const dashboardRoutes = [
	{
		path: "/dashboard/orders",
		element: <OrderManagement />,
	},
	{
		path: "/dashboard/payouts",
		element: <PayoutsManagement />,
	},
	{
		path: "/dashboard/outlets",
		element: <OutletManagement />,
	},
	{
		path: "/dashboard/deliveries",
		element: <DeliveriesPage />,
	},
	{
		path: "/dashboard/pos",
		element: <POSSystem />,
	},
	{
		path: "/dashboard/whatsapp",
		element: <WhatsappInbox />,
	},
	{
		path: "/dashboard/whatsapp/analytics",
		element: <WhatsAppAnalytics />,
	},
]; 