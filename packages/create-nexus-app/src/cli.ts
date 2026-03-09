#!/usr/bin/env bun
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const target = process.argv[2] ?? "my-nexus-runtime";

  await mkdir(join(target, "src"), { recursive: true });

  await writeFile(
    join(target, "package.json"),
    JSON.stringify(
      {
        name: target,
        private: true,
        type: "module",
        scripts: {
          dev: "bun run src/index.ts",
        },
        dependencies: {
          "@nexus/orchestrator-core": "workspace:*",
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(target, "src/index.ts"),
    `import { createQuestRuntime } from "@nexus/orchestrator-core";\n\nconst runtime = createQuestRuntime({\n  name: "${target}",\n  version: "0.1.0"\n});\n\nconsole.log(runtime.getMetadata());\n`,
  );

  console.log(`Scaffolded ${target}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
