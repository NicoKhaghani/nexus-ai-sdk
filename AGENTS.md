# AGENTS

This repository contains **Quest-based execution runtimes** and **capability packs** used by Nexus AI.

## What is a Quest?
A Quest is a single execution unit:

**objective → plan → run → verify → assemble → deliver**

When paid execution is enabled, a Quest is quoted and settled once through x402.

## Core Concepts

### Quest Plan
A structured plan containing:
- phases
- steps
- dependencies
- target deliverable

### Capability
A specialized execution unit such as:
- text generation
- code generation
- media generation
- schema validation
- formatting / export

### Execution Graph
A dependency-aware graph that allows:
- sequential execution
- safe parallel execution
- retries
- validation hooks

### Execution Summary
A normalized summary of:
- tasks executed
- validation results
- total duration
- settlement metadata
