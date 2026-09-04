import { useState, useCallback, useMemo } from 'react'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import BusinessGraph from './components/twin/BusinessGraph'
import InsightPanel from './components/intelligence/InsightPanel'
import AskNexus from './components/intelligence/AskNexus'
import { useBusinessGraph } from './hooks/useBusinessGraph'
import { runSimulation } from './engine/simulationEngine'

export default function App() {
  const graph = useBusinessGraph()
  const [query, setQuery] = useState('')
  const [activeScenario, setActiveScenario] = useState(null)

  const handleScenarioSelect = useCallback(
    (scenario) => {
      setQuery(scenario.query)
      const simulation = runSimulation(scenario, {
        nodes: graph.nodes,
        edges: graph.edges,
      })
      const enrichedScenario = {
        ...scenario,
        simulation,
        preview: simulation?.preview || scenario.preview,
        affectedNodeIds: simulation?.affectedNodeIds || scenario.affectedNodeIds,
        hops: scenario.hops || simulation?.hops,
      }
      setActiveScenario(enrichedScenario)
      graph.applyScenarioHighlight(
        enrichedScenario.affectedNodeIds,
        enrichedScenario.focusNodeId || scenario.focusNodeId,
        enrichedScenario.hops
      )
    },
    [graph]
  )

  const handleClearScenario = useCallback(() => {
    setActiveScenario(null)
    setQuery('')
    graph.clearScenarioHighlight()
    graph.clearSelection()
  }, [graph])

  // Clicking a node directly (focus mode) always supersedes an active
  // scenario preview, so the Intelligence panel and graph never show two
  // contradictory stories at once.
  const handleSelectNode = useCallback(
    (nodeId) => {
      setActiveScenario(null)
      setQuery('')
      graph.selectNode(nodeId)
    },
    [graph]
  )

  // "View dependency" in the Hidden Dependency insight focuses the graph
  // on Product X without going through the scenario/simulation flow.
  const handleViewDependency = useCallback(
    (nodeId) => {
      graph.clearScenarioHighlight()
      graph.selectNode(nodeId)
    },
    [graph]
  )

  // BusinessGraph reads `selectNode` off this object directly, so routing
  // it through the wrapper above keeps App.jsx's scenario state in sync
  // without changing the hook's public shape for other consumers.
  const graphForTwin = useMemo(() => ({ ...graph, selectNode: handleSelectNode }), [graph, handleSelectNode])

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Sidebar />
        <BusinessGraph graph={graphForTwin} />
        <InsightPanel
          activeScenario={activeScenario}
          selectedNode={graph.selectedNode}
          onViewDependency={handleViewDependency}
          onClearScenario={handleClearScenario}
        />
      </main>
      <AskNexus
        query={query}
        onQueryChange={setQuery}
        onScenarioSelect={handleScenarioSelect}
        activeScenarioId={activeScenario?.id}
      />
    </div>
  )
}
