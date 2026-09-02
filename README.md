# NEXUS — Business Dependency Intelligence

**SEE WHAT BREAKS NEXT.**

NEXUS is an AI-powered Business Dependency Intelligence platform for merchants. It maps a business's economic ecosystem — suppliers, inventory, products, bundles, customers, revenue, and Razorpay payment signals — as an interactive **Business Digital Twin**, so merchants can see hidden dependencies and simulate cascading consequences before making a decision.

This repository currently implements **Phase 1: Premium UI + Business Digital Twin foundation.**

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`). Best viewed at 1366×768 or larger.

```bash
npm run build     # production build
npm run preview   # preview the production build locally
```

## What's implemented in Phase 1

- Full visual design system (`src/index.css`) — dark, cinematic, restrained accent usage per the NEXUS palette.
- Three-column application shell: Business Signals rail → Business Digital Twin → NEXUS Intelligence panel, with an Ask NEXUS command bar beneath.
- Interactive SVG Digital Twin (`src/components/twin/`): 8 business nodes, 8 dependency edges, hover-based neighborhood highlighting, click-to-inspect Node Inspector, animated dependency flow particles, and three graph controls (Dependencies / Risk / Filter) plus Reset View.
- NEXUS Intelligence panel: Hidden Dependency insight, Cascade Risk score + propagation pathway.
- Ask NEXUS command bar with 3 scenario chips that drive a controlled mock cascade preview and graph highlight.
- Structured, engine-ready mock data: `src/data/businessData.js`, `scenarios.js`, `mockTransactions.js`.

## What's intentionally NOT implemented yet

Per the project roadmap, `src/engine/*` and `src/services/*` are reserved module boundaries only — each throws a clear "implemented in Phase N" error rather than faking logic:

- `engine/dependencyEngine.js`, `simulationEngine.js`, `riskEngine.js`, `interventionEngine.js` → Phase 2/3
- `services/razorpayService.js` → Phase 4 (live Razorpay test-mode signals)
- `services/aiService.js` → Phase 5 (free-text natural language understanding)

The Ask NEXUS bar handles free-text input that doesn't match a known scenario honestly (a small caption explains guided scenarios are what's available now), rather than simulating a fake AI response.

## Architecture notes

- Graph interaction state (hover, selection, highlight modes, scenario highlighting) is centralized in `src/hooks/useBusinessGraph.js` and passed down as a single `graph` object — this is the seam Phase 2's real dependency engine will plug into.
- Node/edge visual importance and health are data-driven (`src/utils/constants.js`), not hardcoded per component, so Phase 2 can update `businessData.js` from a live engine without touching UI code.
- `src/data/mockTransactions.js` mirrors the shape a future Razorpay Orders/Payments API response would take, to minimize rework in Phase 4.

## A note on this build environment

This project was generated in a sandboxed environment without npm registry access, so `npm install` / `npm run build` could not be executed here to produce a build log. Every file was manually syntax-checked and all imports were cross-validated against actual exports. Please run `npm install && npm run build` locally as your first step and report back anything that needs fixing — given the scope of Phase 1, a small import/prop mismatch is possible despite the manual review.
