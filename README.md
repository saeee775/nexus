# NEXUS

### AI-Powered Business Dependency Intelligence

NEXUS is an AI-powered business digital twin that helps businesses understand how operational disruptions can affect inventory, products, bundles, customer segments, and revenue.

Instead of showing isolated dashboards, NEXUS models the business as a connected dependency graph and simulates how a disruption travels through the system over time.

---

## The Problem

Businesses often know that a supplier delay, inventory shortage, or payment disruption is risky, but they do not always know:

- Which products will be affected first
- How long existing inventory can protect the business
- Which customer segments are exposed
- How much revenue may be at risk
- When an intervention should happen
- Whether an action actually reduces the impact

Traditional dashboards show the current state of the business. NEXUS focuses on the next possible state.

---

## The Solution

NEXUS creates a living business dependency graph:

```text
Supplier
   ↓
Inventory
   ↓
Product
   ↓
Bundle
   ↓
Customer Cohort
   ↓
Revenue
```

The system simulates operational shocks and calculates how the disruption propagates through the graph.

For example:

```text
Supplier A delayed
        ↓
Shared inventory begins decreasing
        ↓
Product X becomes exposed
        ↓
Bundle containing Product X is affected
        ↓
VIP customer cohort is exposed
        ↓
Estimated revenue exposure increases
```

The simulation accounts for inventory buffers, so the system does not assume that every disruption causes immediate damage.

---

## Core Features

### Business Dependency Graph

Visualizes relationships between:

- Suppliers
- Inventory pools
- Products
- Bundles
- Customer cohorts
- Revenue streams

The graph makes hidden business dependencies visible.

### Shock Simulation

Users can simulate disruptions such as:

- Supplier delays
- Inventory shortages
- Product-level disruptions
- Operational dependency failures

The simulation evaluates how the shock develops over time.

### Shock Replay

The timeline allows users to move through a simulated disruption day by day.

It shows:

- Nodes exposed
- Nodes still protected
- Estimated revenue exposure
- Current risk score
- The point at which the cascade begins

This makes the simulation explainable instead of presenting only a final number.

### Last Safe Moment

NEXUS identifies the latest point at which an intervention can still meaningfully reduce the modeled impact.

This helps answer:

> How much time do we have before this disruption becomes expensive?

### Intervention Modeling

The system compares the original cascade with a modeled intervention outcome.

Examples include:

- Restocking inventory
- Reducing supplier dependency
- Protecting high-value products
- Prioritizing critical customer cohorts

The results are presented as modeled outcomes, not guaranteed predictions.

### Risk and Revenue Exposure

NEXUS dynamically calculates:

- Risk score
- Estimated revenue exposure
- Modeled revenue protected
- Exposed nodes
- Protected nodes
- Critical dependency paths

### Explainable Intelligence

The intelligence panel explains:

- Why the disruption is spreading
- Which dependency caused the next exposure
- Why certain nodes remain protected
- What action is recommended
- What assumptions the simulation is using

---

## How It Works

NEXUS combines deterministic business logic, graph traversal, simulation, and AI-assisted interpretation.

### High-Level Architecture

```text
React Interface
      ↓
Business Graph State
      ↓
Simulation Engine
      ↓
Dependency and Risk Analysis
      ↓
Intervention Modeling
      ↓
Intelligence Narrative
      ↓
Graph + Timeline + Metrics
```

### Main Layers

#### Data Layer

Contains the canonical business model, including:

- Business nodes
- Dependency edges
- Inventory values
- Product relationships
- Customer cohorts
- Revenue assumptions
- Mock payment signals

#### Graph Layer

Represents the business as a directed dependency graph.

Each edge describes how one business entity depends on another.

#### Simulation Engine

Calculates how a disruption changes the state of the graph over time.

The engine considers:

- Initial inventory
- Daily consumption
- Supplier delay duration
- Dependency relationships
- Exposure thresholds
- Downstream propagation

#### Risk Engine

Converts the simulated business state into a dynamic risk score based on the current exposure.

#### Intervention Engine

Models potential actions and compares the original scenario with the intervention outcome.

#### Intelligence Layer

Converts simulation results into readable explanations and recommendations.

AI is used where interpretation and narrative generation are useful. Core numerical calculations remain deterministic and explainable.

---

## AI Judgment

NEXUS does not use AI for every operation.

### Where AI Is Useful

AI is useful for:

- Explaining complex dependency chains
- Summarizing simulation results
- Generating readable business narratives
- Translating technical risk signals into decision-oriented recommendations

### Where AI Is Not Used

Deterministic logic is used for:

- Inventory calculations
- Graph traversal
- Dependency propagation
- Risk calculations
- Timeline state changes
- Intervention comparisons

This separation makes the system more reliable, testable, and explainable.

---

## Example Scenario

### Supplier A Delay

A delay from Supplier A affects a shared inventory pool used by Product X.

At the beginning of the simulation:

- Inventory buffers protect downstream products
- Revenue exposure remains at zero
- Only the supplier is marked as exposed

As time passes:

- Inventory decreases
- Product X becomes exposed
- Bundles using Product X are affected
- The related customer cohort becomes exposed
- Estimated revenue exposure increases

The system identifies the point at which the business moves from protected to exposed.

---

## Tech Stack

- React
- Vite
- JavaScript
- SVG-based graph visualization
- Lucide React
- Deterministic simulation engine
- Graph-based dependency modeling
- Mock payment and business data

---

## Project Structure

```text
src/
├── components/
│   ├── dashboard/
│   ├── intelligence/
│   └── twin/
├── data/
│   ├── businessData.js
│   ├── mockTransactions.js
│   └── scenarios.js
├── engine/
│   ├── dependencyEngine.js
│   ├── interventionEngine.js
│   ├── riskEngine.js
│   └── simulationEngine.js
├── hooks/
│   └── useBusinessGraph.js
├── services/
│   ├── aiService.js
│   └── razorpayService.js
├── utils/
│   ├── constants.js
│   └── graphUtils.js
├── App.jsx
└── main.jsx
```

---

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/saeee775/nexus-graph-redesign.git
```

Move into the project directory:

```bash
cd nexus-graph-redesign
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown in the terminal.

For example:

```text
http://localhost:5173
```

If that port is already in use, Vite will automatically select another available port.

---

## Available Scripts

```bash
npm run dev
```

Starts the development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run preview
```

Previews the production build locally.

---

## Current Scope

NEXUS currently uses a deterministic business model and mock operational/payment data to demonstrate dependency intelligence and disruption simulation.

The current prototype focuses on:

- Business dependency visualization
- Time-based shock propagation
- Inventory-aware exposure
- Risk estimation
- Intervention modeling
- Explainable recommendations

The values shown in the interface are modeled estimates based on scenario assumptions. They are not live financial forecasts.

---

## Design Principles

### Explainability Over Black-Box Predictions

Every major result should be traceable to a dependency, assumption, or simulation state.

### Time Matters

A disruption is not equally dangerous at every moment. Inventory buffers and intervention timing are central to the model.

### Graph First

The dependency graph is the primary interface, not a secondary chart.

### Honest Intelligence

The system distinguishes between:

- Actual data
- Mock data
- Simulation assumptions
- Estimated exposure
- Modeled intervention outcomes

### Actionable Risk

The goal is not only to identify what is wrong, but to explain what should happen next.

---

## Why NEXUS Matters

NEXUS changes the question from:

> What is the current business risk?

to:

> If this dependency fails, how will the impact spread, when will it become serious, and what can we do before that happens?

This allows businesses to move from reactive reporting to proactive decision-making.

---

## Future Improvements

Potential future extensions include:

- Live Razorpay payment integration
- Real inventory and ERP integrations
- Persistent business models
- User-defined scenarios
- More advanced intervention optimization
- Historical simulation comparison
- Multi-supplier resilience analysis
- Real-time alerts
- Authentication and team workspaces
- Cloud deployment
- More sophisticated AI-generated decision support

---

## Buildathon Context

NEXUS was developed for the Razorpay AI Buildathon.

The project explores how AI, graph modeling, and simulation can be combined to create an intelligent business operating layer that explains operational dependencies and helps businesses prepare for disruption.

---

## Author

Built by Saee Nimbalkar.

GitHub repository:

https://github.com/saeee775/nexus-graph-redesign
