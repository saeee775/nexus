import { RotateCcw, GitBranch, AlertTriangle, Filter } from 'lucide-react'

export default function GraphControls({
  highlightMode,
  onToggleDependencies,
  onToggleRisk,
  signalFilterActive,
  onToggleFilter,
  onReset,
}) {
  return (
    <div className="graph-controls">
      <button className="graph-control-btn" onClick={onReset}>
        <RotateCcw size={12} />
        Reset View
      </button>
      <button
        className={`graph-control-btn ${highlightMode === 'dependencies' ? 'active' : ''}`}
        onClick={onToggleDependencies}
      >
        <GitBranch size={12} />
        Dependencies
      </button>
      <button
        className={`graph-control-btn ${highlightMode === 'risk' ? 'active' : ''}`}
        onClick={onToggleRisk}
      >
        <AlertTriangle size={12} />
        Risk
      </button>
      <button
        className={`graph-control-btn ${signalFilterActive ? 'active' : ''}`}
        onClick={onToggleFilter}
      >
        <Filter size={12} />
        Filter
      </button>
    </div>
  )
}
