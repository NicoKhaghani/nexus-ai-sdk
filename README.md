# Nexus Orchestrator SDK

[![CI](https://github.com/NicoKhaghani/nexus-orchestrator-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/NicoKhaghani/nexus-orchestrator-sdk/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)
![Monorepo](https://img.shields.io/badge/architecture-monorepo-black)

Build, observe, and settle **Quest-based AI execution** through a unified orchestration surface.

Nexus turns a **single objective** into a **complete structured outcome**.

objective → Quest Plan → execution graph → verification → assembly → final delivery

Unlike traditional chat interfaces, Nexus operates as an **AI execution runtime**.

It:

• interprets intent  
• decomposes objectives into stages and steps  
• routes work to specialized capabilities  
• schedules independent execution in parallel  
• validates intermediate outputs  
• assembles a final result  
• settles execution once per Quest via **x402**

---

# Overview

## Why Nexus

Most AI systems expose **isolated tools** or **single-model chat interfaces**.

Nexus exposes an **execution surface**.

Instead of interacting with tools manually, users express an **objective**.

Nexus then:

1. builds a **Quest Plan**
2. constructs an **execution graph**
3. routes work to specialized capabilities
4. validates outputs
5. assembles the final artifact

---

## Core Properties

### Quest-first execution

Requests are interpreted as **objectives**, not message loops.

### Observable orchestration

Execution exposes phases, step status, validation notes, and summaries.

### Capability routing

Text, code, media, and verification capabilities are coordinated internally.

### Parallel execution

Independent steps execute concurrently when dependencies allow.

### Single settlement

Execution is quoted once, validated once, and settled once via **x402**.

### Composable runtime

Capabilities can be defined and integrated through package interfaces.

---

# System Architecture

Nexus converts a single objective into a structured execution pipeline.


User Objective
│
▼
Quest Planner
│
▼
Execution Graph
┌───────────────┬───────────────┬───────────────┐
▼ ▼ ▼
Text Capability Code Capability Media Capability
│
▼
Verification Layer
│
▼
Assembly
│
▼
Final Deliverable


---

# Execution Lifecycle

Every Quest follows a deterministic lifecycle.

1. Objective interpretation  
2. Quest Plan generation  
3. Execution graph construction  
4. Capability routing  
5. Parallel execution  
6. Verification  
7. Assembly  
8. Final delivery  
9. Settlement (x402)

---

# Monorepo Structure


nexus-orchestrator-sdk/

packages/
orchestrator-core/ # Quest planning + execution graph + assembly
capability-runtime/ # Capability contracts, adapters, routing metadata
x402-kit/ # Quote / validate / retry-with-proof helpers
create-nexus-app/ # CLI scaffolding tool

scripts/ # Build and release helpers
.github/workflows/ # CI
.changeset/ # Versioning and release metadata
.husky/ # Git hooks

README.md
AGENTS.md
CONTRIBUTING.md
package.json
justfile


Each package contains:

• package.json  
• src/  
• README.md  
• examples/  
• __tests__/ (where applicable)

---

# Key Packages

## @nexus/orchestrator-core

Core Quest runtime responsible for:

• objective interpretation  
• Quest Plan generation  
• dependency-aware execution graph  
• validation hooks  
• assembly into a single deliverable

---

## @nexus/capability-runtime

Capability interfaces and adapters.

Includes:

• input / output contracts  
• routing metadata  
• execution adapters  
• capability registry helpers

---

## @nexus/x402-kit

Settlement helpers for **pay-per-execution flows**.

Includes:

• quote building  
• quote validation  
• retry-with-proof helpers  
• response typing

---

## @nexus/create-nexus-app

CLI scaffold used to bootstrap a **Nexus-compatible runtime**.

---

# Features

### Quest Plan generation

Turn an objective into a structured execution plan with stages, steps, and dependencies.

---

### Execution Graph

Run work sequentially or in parallel depending on dependency constraints.

---

### Verification

Apply schema validation, constraints, or business checks before assembly.

---

### Assembly

Merge outputs into a coherent result.

Examples:

• text  
• files  
• structured data  
• composite deliverables

---

### Execution Observability

Track:

• phase transitions  
• step status  
• validation notes  
• execution duration  
• cost summary

---

### x402 Settlement

Return a quote before execution, validate once, and settle once per Quest.

---

# Example


import { createQuestRuntime } from "@nexus/orchestrator-core";
import { z } from "zod";

const runtime = createQuestRuntime({
name: "demo-runtime",
version: "0.1.0",
description: "Minimal Nexus-compatible Quest runtime",
});

runtime.defineCapability({
key: "text.generate",
input: z.object({ prompt: z.string() }),
output: z.object({ text: z.string() }),
async execute({ prompt }) {
return { text: Generated output for: ${prompt} };
},
});

runtime.defineQuest({
key: "investor.onepager",
async plan({ objective }) {
return {
phases: [
"interpretation",
"planning",
"execution",
"verification",
"assembly"
],
steps: [
{
id: "draft",
uses: "text.generate",
input: { prompt: objective }
}
],
deliverable: { from: "draft" }
};
}
});

export default runtime;


This minimal example demonstrates the Nexus execution model:

1. define a runtime  
2. register capabilities  
3. define how a Quest is planned  
4. execute through a structured graph  
5. return one assembled result  

---

# Quick Start

## Prerequisites

• Bun ≥ 1.1  
• Git

---

## Install dependencies


git clone https://github.com/NicoKhaghani/nexus-orchestrator-sdk

cd nexus-orchestrator-sdk
bun install


---

## Build all packages


bun run build:packages


---

## Run tests


bun test


---

## Run the CLI


bun run create:nexus-app


---

# Working with the Codebase

1. Install dependencies


bun install


2. Explore packages under `packages/`

3. Review examples inside each package

4. Build packages


bun run build:packages


5. Run tests before opening PRs


bun test


---

# Contributing

Please see **CONTRIBUTING.md** for:

• development setup  
• coding standards  
• testing guidelines  
• release process  

---

# License

MIT
