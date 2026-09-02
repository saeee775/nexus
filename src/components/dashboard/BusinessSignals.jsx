import { IndianRupee, ShieldCheck, PackageSearch, Users } from 'lucide-react'
import SignalCard from './SignalCard'
import { businessMetrics } from '../../data/businessData'

export default function BusinessSignals() {
  const { revenue, paymentHealth, inventoryRisk, customerExposure } = businessMetrics

  return (
    <div className="signal-rail">
      <SignalCard
        variant="hero"
        icon={IndianRupee}
        accent="#c6ff3b"
        label="Revenue"
        value={revenue.value}
        delta={revenue.delta}
        caption={revenue.caption}
      />

      <div className="signal-list">
        <SignalCard
          icon={ShieldCheck}
          accent="#8b7cff"
          label="Payment Health"
          value={paymentHealth.value}
          caption={paymentHealth.caption}
        />
        <SignalCard
          icon={PackageSearch}
          accent="#ffb347"
          label="Inventory Risk"
          value={inventoryRisk.value}
          caption={inventoryRisk.caption}
        />
        <SignalCard
          icon={Users}
          accent="#ff5c4d"
          label="Customer Exposure"
          value={customerExposure.value}
          caption={customerExposure.caption}
        />
      </div>
    </div>
  )
}
