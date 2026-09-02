import { Activity } from 'lucide-react'
import BusinessSignals from '../dashboard/BusinessSignals'

export default function Sidebar() {
  return (
    <section className="panel rail-left">
      <div className="panel-header">
        <span className="panel-title">
          <Activity size={13} />
          Business Signals
        </span>
      </div>
      <div className="panel-body">
        <BusinessSignals />
      </div>
    </section>
  )
}
