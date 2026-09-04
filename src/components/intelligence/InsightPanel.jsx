import { useState, useEffect } from 'react'
import { BrainCircuit } from 'lucide-react'
import HiddenDependency from './HiddenDependency'
import SimulationResult from './SimulationResult'
import NodeObservation from './NodeObservation'
import RiskPanel from '../dashboard/RiskPanel'
import { cascadeRisk } from '../../data/businessData'

export default function InsightPanel({ activeScenario, selectedNode, onViewDependency, onClearScenario }) {
  const [selectedInterventionId, setSelectedInterventionId] = useState(null)

  // Reset selected intervention whenever scenario changes
  useEffect(() => {
    setSelectedInterventionId(activeScenario?.simulation?.recommendation?.interventionId || null)
  }, [activeScenario?.id])

  const simulationRisk = activeScenario?.simulation?.cascadeRisk
  const interventions = activeScenario?.simulation?.interventions || []

  const activeIntervention =
    interventions.find((i) => i.id === selectedInterventionId) ||
    activeScenario?.simulation?.recommendation

  const riskScore = activeIntervention?.residualSeverity !== undefined
    ? activeIntervention.residualSeverity
    : (simulationRisk?.score ?? cascadeRisk.score)

  const riskLabel = activeIntervention
    ? `Risk reduced from ${simulationRisk?.score || cascadeRisk.score} to ${activeIntervention.residualSeverity} via ${activeIntervention.name}`
    : (simulationRisk?.label ?? cascadeRisk.label)

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
            <SimulationResult
              scenario={activeScenario}
              onClear={onClearScenario}
              selectedInterventionId={selectedInterventionId}
              onSelectIntervention={setSelectedInterventionId}
            />
          ) : selectedNode ? (
            <NodeObservation node={selectedNode} />
          ) : (
            <HiddenDependency onView={onViewDependency} />
          )}

          <RiskPanel
            score={riskScore}
            label={riskLabel}
            steps={simulationRisk?.steps ?? cascadeRisk.steps}
          />
        </div>
      </div>
    </section>
  )
}
