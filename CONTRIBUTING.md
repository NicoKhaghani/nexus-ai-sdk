# Contributing to Nexus Orchestrator SDK

Thank you for contributing.

## Table of Contents
- Getting Started
- Development Workflow
- Making Changes
- Testing
- Pull Requests
- Release Process
- Code Standards

## Getting Started

### Prerequisites
- Bun >= 1.1
- Git
- A code editor (VS Code recommended)

### Initial Setup
1. Clone the repository
```bash
git clone <your-repo-url>
cd nexus-orchestrator-sdk
```

2. Install dependencies
```bash
bun install
```

This installs all monorepo dependencies.

### Monorepo Structure
The repository is organized as a monorepo with multiple packages:

```text
nexus-orchestrator-sdk/
  packages/
    orchestrator-core/     # Quest runtime
    capability-runtime/    # Capability contracts and adapters
    x402-kit/              # Settlement helpers
    create-nexus-app/      # CLI scaffolding tool
  scripts/                 # Build and release scripts
  package.json             # Root package configuration
  README.md                # Main documentation
```

Each package has its own:
- `package.json` — dependencies and scripts
- `src/` — source code
- `__tests__/` — test files where applicable
- `README.md` — package-specific documentation

## Development Workflow

### Building Packages
Build all packages:
```bash
bun run build:packages
```

Build a specific package:
```bash
cd packages/orchestrator-core
bun run build
```

### Development Mode
Most packages support watch mode:
```bash
cd packages/orchestrator-core
bun run dev
```

### Running Examples
Packages include examples demonstrating usage:
```bash
cd packages/orchestrator-core
bun run examples/minimal-runtime.ts
```

## Making Changes

### Branch Naming
Use descriptive branch names:
- `feature/add-quest-validator`
- `fix/quote-validation-bug`
- `docs/update-runtime-readme`
- `refactor/simplify-step-scheduler`
- `test/add-x402-integration-tests`

### Commit Messages
Format:
```text
<type>: <subject>

<body>

<footer>
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

## Testing

### Running Tests
Run all tests across the monorepo:
```bash
bun test
```

Run tests for a specific package:
```bash
cd packages/orchestrator-core
bun test
```

Run tests in watch mode:
```bash
bun test --watch
```

### Test Coverage
Aim for coverage especially for:
- public APIs
- core orchestration logic
- edge cases and error handling
- x402 quote / validation flows

## Pull Requests

### Before Submitting
1. Test your changes
```bash
bun test
```

2. Build packages
```bash
bun run build:packages
```

3. Check TypeScript types
```bash
bunx tsc --noEmit
```

4. Update documentation if APIs changed

### PR Checklist
- [ ] Code follows TypeScript and ESM standards
- [ ] Tests pass locally
- [ ] New functionality includes tests
- [ ] Documentation is updated
- [ ] Commit messages follow guidelines
- [ ] PR description explains the changes

## Release Process

Releases are managed using Changesets.

### For Contributors
When making changes that should be included in release notes:
1. Create a changeset
```bash
bun run changeset
```
2. Follow the prompts
3. Commit the changeset file with your code

## Code Standards
- Use strict TypeScript mode
- Export explicit types for public APIs
- Keep package READMEs up to date
- Add examples for public APIs
- Do not swallow errors; handle or propagate explicitly
