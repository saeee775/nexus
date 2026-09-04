import { useState, useEffect, useMemo, useCallback } from 'react'
import { Zap, X, ShieldCheck, Play, Pause, RotateCcw, Clock } from 'lucide-react'
import { runSimulation } from '../../engine/simulationEngine'

const CONFIDENCE_LABEL = {
  high: { text: 'High Confidence (Modeled)', color: 'var(--status-healthy)' },
  medium: { text: 'Medium Confidence (Modeled)', color: 'var(--status-warning)' },
  low: { text: 'Low Confidence (Modeled)', color: 'var(--status-critical)' },
}

/**
 * Decision-grade Simulation & Shock Replay Timeline component.
 * Features:
 *  - Time-sliced disruption replay (Day 0 to scenario duration)
 *  - Play / Pause / Scrubber / Reset controls
 *  - Compact 5-metric Business Impact summary
 *  - Dynamic "Why this happened" causal explanation
 *  - Modeled intervention replay (original cascade vs mitigated outcome)
 *  - Honest scenario modeling language
 */
export default function SimulationResult({
  scenario,
  onClear,
  selectedInterventionId,
  onSelectIntervention,
  onTimelineChange,
}) {
  if (!scenario) return null

  const totalDays = scenario.simulation?.timeline?.totalDays ?? 10
  const [currentDay, setCurrentDay] = useState(totalDays)
  const [isPlaying, setIsPlaying] = useState(false)
  const [replayMode, setReplayMode] = useState('cascade') // 'cascade' | 'intervention'

  // Reset to full duration and cascade view when scenario changes
  useEffect(() => {
    const d = scenario.simulation?.timeline?.totalDays ?? 10
    setCurrentDay(d)
    setIsPlaying(false)
    setReplayMode('cascade')
  }, [scenario.id])

  // Recompute simulation state for currentDay using existing simulation engine
  const currentSim = useMemo(() => {
    return runSimulation(scenario, { currentDay })
  }, [scenario, currentDay])

  const interventions = currentSim?.interventions || []
  const recommendation = currentSim?.recommendation

  const activeIntervention =
    interventions.find((i) => i.id === selectedInterventionId) ||
    interventions.find((i) => i.recommended) ||
    recommendation ||
    currentSim?.intervention

  // Derive effective simulation state based on replayMode (cascade vs modeled intervention outcome)
  const effectiveSim = useMemo(() => {
    if (!currentSim) return null
    if (replayMode !== 'intervention' || !activeIntervention) {
      return currentSim
    }

    // When viewing modeled intervention outcome, contract downstream exposure
    // to reflect the protective effect of the selected action.
    let mitigatedNodeIds = [currentSim.focusNodeId]
    if (activeIntervention.id === 'expedite-supplier-b') {
      mitigatedNodeIds = [currentSim.focusNodeId, 'supplier-b']
    } else if (activeIntervention.id === 'draw-shared-inventory') {
      mitigatedNodeIds = [currentSim.focusNodeId, 'shared-inventory', 'product-x']
    } else if (activeIntervention.id === 'ration-vip-priority') {
      mitigatedNodeIds = [currentSim.focusNodeId, 'product-x', 'premium-bundle']
    } else if (activeIntervention.id === 'substitute-product-y') {
      mitigatedNodeIds = [currentSim.focusNodeId, 'product-y']
    } else {
      mitigatedNodeIds = currentSim.affectedNodeIds.slice(0, 2)
    }

    return {
      ...currentSim,
      affectedNodeIds: mitigatedNodeIds,
      severity: {
        ...currentSim.severity,
        score: activeIntervention.residualSeverity ?? currentSim.severity.score,
      },
      cascadeRisk: {
        ...currentSim.cascadeRisk,
        score: activeIntervention.residualSeverity ?? currentSim.cascadeRisk.score,
        label: `Modeled outcome via ${activeIntervention.name}`,
      },
      estimatedRevenueExposure: {
        ...currentSim.estimatedRevenueExposure,
        formatted: activeIntervention.formattedRevenueExposureAfter,
        amount: activeIntervention.revenueExposureAfter,
      },
    }
  }, [currentSim, replayMode, activeIntervention])

  // Notify parent components so RiskPanel and Digital Twin graph highlight update in sync
  useEffect(() => {
    if (effectiveSim) {
      onTimelineChange?.(effectiveSim)
    }
  }, [effectiveSim, onTimelineChange])

  // Playback timer (steps through days smoothly)
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setCurrentDay((prev) => {
        if (prev >= totalDays) {
          setIsPlaying(false)
          return totalDays
        }
        return prev + 1
      })
    }, 850)
    return () => clearInterval(timer)
  }, [isPlaying, totalDays])

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      if (currentDay >= totalDays) {
        setCurrentDay(0)
      }
      setIsPlaying(true)
    }
  }, [isPlaying, currentDay, totalDays])

  const handleResetTimeline = useCallback(() => {
    setIsPlaying(false)
    setCurrentDay(totalDays)
  }, [totalDays])

  const confidence = CONFIDENCE_LABEL[currentSim?.preview?.confidence] || CONFIDENCE_LABEL.medium
  const cohorts = currentSim?.affectedCustomerCohorts || []

  // Compact Business Impact summary metrics
  const nodesExposedCount = effectiveSim?.affectedNodeIds?.length || 0
  const bufferProtectedCount = currentSim?.bufferProtectedNodeIds?.length || 0
  const estimatedExposureStr = replayMode === 'intervention' && activeIntervention
    ? activeIntervention.formattedRevenueExposureAfter
    : (currentSim?.estimatedRevenueExposure?.formatted || '₹0')
  const currentRiskScore = replayMode === 'intervention' && activeIntervention
    ? activeIntervention.residualSeverity
    : (currentSim?.severity?.score || 0)
  const baselineRiskScore = currentSim?.baseline?.severity || 20
  const riskDelta = currentRiskScore - baselineRiskScore

  const timelineInfo = currentSim?.timeline || {}
  const isBufferBreached = timelineInfo.isBreached
  const bufferRemaining = timelineInfo.bufferRemainingDays ?? 0
  const deficitDays = timelineInfo.deficitDays ?? 0

  return (
    <div className="insight-block">
      {/* Header */}
      <div className="insight-eyebrow" style={{ justifyContent: 'space-between', display: 'flex' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={12} />
          Simulation & Shock Replay
        </span>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', display: 'flex', cursor: 'pointer' }}
          aria-label="Clear simulation preview"
        >
          <X size={13} />
        </button>
      </div>

      {/* Shock Replay Timeline Scrubber */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--r-sm)',
          padding: '8px 10px',
          marginTop: 8,
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-lime)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} />
            SHOCK REPLAY: Day {currentDay} of {totalDays}
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: isBufferBreached ? 'var(--status-critical-soft)' : 'var(--status-healthy-soft)',
              color: isBufferBreached ? 'var(--status-critical)' : 'var(--status-healthy)',
            }}
          >
            {isBufferBreached
              ? (deficitDays > 0 ? `Stockout: ${deficitDays}d deficit` : 'Shock active')
              : `Buffered (${bufferRemaining}d cover remaining)`}
          </span>
        </div>

        {/* Scrubber Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleTogglePlay}
            style={{
              background: isPlaying ? 'rgba(255, 255, 255, 0.12)' : 'var(--accent-lime)',
              color: isPlaying ? 'var(--text-primary)' : '#000',
              border: 'none',
              borderRadius: 4,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            title={isPlaying ? 'Pause replay' : 'Play shock replay'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

          <input
            type="range"
            min="0"
            max={totalDays}
            value={currentDay}
            onChange={(e) => {
              setIsPlaying(false)
              setCurrentDay(Number(e.target.value))
            }}
            style={{
              flex: 1,
              accentColor: 'var(--accent-lime)',
              cursor: 'pointer',
              height: 4,
            }}
            aria-label="Timeline day slider"
          />

          <button
            onClick={handleResetTimeline}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 2,
            }}
            title="Reset timeline to full disruption"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Milestone labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8.5, color: 'var(--text-tertiary)' }}>
          <span>Day 0 (Initial shock)</span>
          {totalDays === 10 && <span>Day 6 (Stock buffer breach)</span>}
          <span>Day {totalDays} (Full duration)</span>
        </div>
      </div>

      {/* Compact Business Impact Summary (5 required metrics) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 5,
          marginBottom: 10,
        }}
      >
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '5px 4px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Timeline</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-lime)', marginTop: 2 }}>Day {currentDay}/{totalDays}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '5px 4px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Exposed</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{nodesExposedCount} nodes</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '5px 4px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Protected</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-healthy)', marginTop: 2 }}>{bufferProtectedCount} nodes</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '5px 4px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Exposure</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-critical)', marginTop: 2 }}>{estimatedExposureStr}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '5px 4px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Risk Score</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: currentRiskScore >= 60 ? 'var(--status-critical)' : 'var(--status-warning)', marginTop: 2 }}>
            {currentRiskScore}/100
          </div>
        </div>
      </div>

      {/* Dynamic Headline & Summary */}
      <p className="insight-text">
        <strong>{currentSim?.preview?.headline}</strong>
      </p>

      {/* Dynamic "Why this happened" Causal Explanation Section */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--r-sm)',
          padding: '8px 10px',
          marginTop: 8,
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', marginBottom: 5 }}>
          Why this happened (Causal Mechanics)
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
          {currentSim?.preview?.causalExplanation || currentSim?.preview?.body}
        </p>

        {/* Key Causal Attributes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5, fontSize: 10, color: 'var(--text-secondary)', marginTop: 7, paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.07)' }}>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Disruption timeline: </span>
            <strong style={{ color: 'var(--text-primary)' }}>Day {currentDay} of {totalDays}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Stock buffer cover: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{timelineInfo.stockDays ?? 6}d</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Stockout deficit: </span>
            <strong style={{ color: deficitDays > 0 ? 'var(--status-critical)' : 'var(--status-healthy)' }}>
              {deficitDays > 0 ? `${deficitDays} days` : '0 days (absorbed)'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>VIP cohort share: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{cohorts[0]?.revenueShare ?? 42}%</strong>
          </div>
        </div>

        {/* Dynamic Propagation Corridor */}
        <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px dashed rgba(255,255,255,0.07)', fontSize: 9.5, color: 'var(--text-tertiary)' }}>
          <span>Corridor: </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {effectiveSim?.affectedNodeIds?.slice(0, 5).join(' → ')}
            {effectiveSim?.affectedNodeIds?.length > 5 ? ` → +${effectiveSim.affectedNodeIds.length - 5} more` : ''}
          </span>
        </div>
      </div>

      {/* Customer Cohorts if affected */}
      {cohorts.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {cohorts.map((c) => (
            <span
              key={c.id}
              className="insight-path-node"
              style={{ background: 'rgba(139, 124, 255, 0.12)', color: 'var(--accent-primary)', fontSize: 10 }}
            >
              {c.label}: {c.impactedMembers} / {c.cohortSize} customers impacted ({c.revenueShare}% rev)
            </span>
          ))}
        </div>
      )}

      {/* Modeled Intervention Replay & Options */}
      {interventions.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--accent-lime)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ShieldCheck size={12} />
              MODELED INTERVENTION REPLAY ({interventions.length})
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Select to simulate</span>
          </div>

          {/* Cascade vs Modeled Outcome Toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button
              onClick={() => setReplayMode('cascade')}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: 4,
                border: replayMode === 'cascade' ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                background: replayMode === 'cascade' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                color: replayMode === 'cascade' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 10,
                fontWeight: replayMode === 'cascade' ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Original Cascade ({currentSim?.estimatedRevenueExposure?.formatted || '₹0'})
            </button>
            <button
              onClick={() => setReplayMode('intervention')}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: 4,
                border: replayMode === 'intervention' ? '1px solid var(--accent-lime)' : '1px solid var(--border-subtle)',
                background: replayMode === 'intervention' ? 'rgba(198, 255, 59, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                color: replayMode === 'intervention' ? 'var(--accent-lime)' : 'var(--text-secondary)',
                fontSize: 10,
                fontWeight: replayMode === 'intervention' ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Modeled Outcome ({activeIntervention?.formattedRevenueExposureAfter || 'Mitigated'})
            </button>
          </div>

          {/* Option Selector Pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {interventions.map((inv, idx) => {
              const isSelected = activeIntervention?.id === inv.id
              return (
                <button
                  key={inv.id}
                  onClick={() => onSelectIntervention?.(inv.id)}
                  style={{
                    background: isSelected ? 'rgba(198, 255, 59, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1px solid var(--accent-lime)' : '1px solid var(--border-subtle)',
                    color: isSelected ? 'var(--accent-lime)' : 'var(--text-secondary)',
                    borderRadius: 100,
                    padding: '3px 8px',
                    fontSize: 10,
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Option {String.fromCharCode(65 + idx)}{inv.recommended ? ' ★' : ''}
                </button>
              )
            })}
          </div>

          {/* Selected Action Card */}
          {activeIntervention && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.22)',
                border: activeIntervention.recommended
                  ? '1px solid rgba(198, 255, 59, 0.3)'
                  : '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-sm)',
                padding: '9px 10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div>
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: activeIntervention.recommended ? 'var(--accent-lime)' : 'var(--text-tertiary)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {activeIntervention.recommended ? 'RECOMMENDED MODELED ACTION' : 'COUNTERFACTUAL OPTION'}
                  </span>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {activeIntervention.name}
                  </div>
                </div>
                <span
                  title="Modeled revenue protected"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--status-healthy)',
                    background: 'var(--status-healthy-soft)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{activeIntervention.formattedRevenueProtected}
                </span>
              </div>

              <p style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.45 }}>
                {activeIntervention.description}
              </p>

              {/* Recommendation Rationale */}
              {activeIntervention.reason && (
                <div style={{ fontSize: 10, color: 'var(--accent-lime)', marginTop: 4, lineHeight: 1.35 }}>
                  <strong>Rationale: </strong>{activeIntervention.reason}
                </div>
              )}

              {/* Metric comparison */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 7,
                  paddingTop: 6,
                  borderTop: '1px dashed rgba(255,255,255,0.08)',
                  fontSize: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Estimated residual exposure: </span>
                  <strong style={{ color: 'var(--status-warning)' }}>
                    {activeIntervention.formattedRevenueExposureAfter}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Risk: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {currentRiskScore} → {activeIntervention.residualSeverity}
                  </strong>
                </div>
              </div>

              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                <strong>Tradeoff: </strong>{activeIntervention.tradeoff}
              </div>

              {/* Derived vs Scenario Assumptions Breakdown */}
              {activeIntervention.assumptions?.length > 0 && (
                <div style={{ fontSize: 9.5, color: 'var(--text-tertiary)', marginTop: 6, paddingTop: 5, borderTop: '1px dashed rgba(255,255,255,0.06)', lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Derived inputs & scenario assumptions:</strong>
                  <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                    {activeIntervention.assumptions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Impact Badge */}
      <div className="insight-path" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <span className="insight-path-node" style={{ background: 'var(--status-critical-soft)', color: 'var(--status-critical)', fontSize: 10.5 }}>
          {replayMode === 'intervention' && activeIntervention
            ? `${activeIntervention.formattedRevenueProtected} modeled revenue protected`
            : (currentSim?.preview?.impact || '₹0 exposure')}
        </span>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: confidence.color }}>{confidence.text}</span>
      </div>
    </div>
  )
}
