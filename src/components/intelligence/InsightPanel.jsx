import { BrainCircuit } from 'lucide-react'
import HiddenDependency from './HiddenDependency'
import SimulationResult from './SimulationResult'
import NodeObservation from './NodeObservation'
import RiskPanel from '../dashboard/RiskPanel'

export default function InsightPanel({ activeScenario, selectedNode, onViewDependency, onClearScenario }) {
  return (
    <section className="panel rail-right">
      <div className="panel-header">
        <span className="panel-title">
          <BrainCircuit size={13} />
          Intelligence
        </span>
      </div>

      <div className="panel-body">
        <div className="intel-body">
          <div className="intel-brain-header">
            <div className="intel-brain-icon">
              <BrainCircuit size={17} color="#fff" />
            </div>
            <div>
              <div className="intel-brain-title">NEXUS AI</div>
              <div className="intel-brain-subtitle">Understanding your business ecosystem</div>
            </div>
          </div>

          {activeScenario ? (
            <SimulationResult scenario={activeScenario} onClear={onClearScenario} />
          ) : selectedNode ? (
            <NodeObservation node={selectedNode} />
          ) : (
            <HiddenDependency onView={onViewDependency} />
          )}

          <RiskPanel />
        </div>
      </div>
    </section>
  )
}
