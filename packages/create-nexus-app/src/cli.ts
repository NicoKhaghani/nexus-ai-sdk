#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PKG_JSON = (name: string) =>
  JSON.stringify(
    {
      name,
      private: true,
      type: "module",
      scripts: { dev: "tsx src/index.ts", start: "node --experimental-strip-types src/index.ts" },
      dependencies: {
        "@nexus/orchestrator-core": "^0.1.0",
        zod: "^3.23.8",
      },
      devDependencies: { tsx: "^4.0.0", typescript: "^5.4.0" },
    },
    null,
    2,
  );

const INDEX_TS = `import { createQuestRuntime } from "@nexus/orchestrator-core";
import { z } from "zod";

const runtime = createQuestRuntime({ name: "%NAME%", version: "0.1.0" });

runtime.defineCapability({
  key: "text.generate",
  input: z.object({ prompt: z.string() }),
  output: z.object({ text: z.string() }),
  async execute({ prompt }) {
    return { text: \`Generated: \${prompt}\` };
  },
});

runtime.defineQuest({
  key: "demo",
  plan: async ({ objective }) => ({
    phases: ["interpretation", "planning", "execution", "verification", "assembly", "delivered"],
    steps: [{ id: "draft", uses: "text.generate", input: { prompt: objective } }],
    deliverable: { from: "draft" },
  }),
});

const unsubscribe = runtime.on((e) => console.log("event:", e.type));
const plan = await runtime.plan("demo", "Scaffolded Nexus runtime");
const result = await runtime.execute(plan);
unsubscribe();

console.log("deliverable:", result.deliverable);
console.log("summary:", result.summary);
`;

const README_MD = (name: string) => `# ${name}

A Nexus-compatible Quest runtime scaffolded with \`create-nexus-app\`.

\`\`\`bash
npm install
npm run dev
\`\`\`
`;

async function main() {
  const target = process.argv[2] ?? "my-nexus-runtime";
  await mkdir(join(target, "src"), { recursive: true });

  await writeFile(join(target, "package.json"), PKG_JSON(target));
  await writeFile(join(target, "src/index.ts"), INDEX_TS.replaceAll("%NAME%", target));
  await writeFile(join(target, "README.md"), README_MD(target));
  await writeFile(
    join(target, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );

  console.log(`Scaffolded ${target}/`);
  console.log(`  cd ${target} && npm install && npm run dev`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
