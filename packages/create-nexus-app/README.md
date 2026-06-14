# @nexus/create-nexus-app

Scaffold a runnable Nexus runtime project.

```bash
bun run create:nexus-app my-runtime
cd my-runtime && npm install && npm run dev
```

Generates a `package.json`, `tsconfig.json`, and a `src/index.ts` that defines a capability, plans a
quest, executes it, and prints the deliverable.
