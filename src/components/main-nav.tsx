import { Link, useLocation } from "react-router-dom"

interface NavItem {
  href: string
  label: string
  active: boolean
}

export function MainNav() {
  const { pathname } = useLocation()

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Overview",
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/products",
      label: "Products",
      active: pathname === "/dashboard/products",
    },
    {
      href: "/dashboard/orders",
      label: "Orders",
      active: pathname === "/dashboard/orders",
    },
    {
      href: "/dashboard/outlets",
      label: "Outlets",
      active: pathname === "/dashboard/outlets",
    },
    {
      href: "/dashboard/deliveries",
      label: "Deliveries",
      active: pathname === "/dashboard/deliveries",
    },
  ]

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={`text-sm font-medium transition-colors hover:text-primary ${
            item.active
              ? "text-black dark:text-white"
              : "text-muted-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
} 