import { DeliveriesClient } from "./components/client"

const DeliveriesPage = () => {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <DeliveriesClient />
      </div>
    </div>
  )
}

export default DeliveriesPage 