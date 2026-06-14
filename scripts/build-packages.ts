import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

async function runBuild(cwd: string) {
  return await new Promise<void>((resolve, reject) => {
    const proc = spawn("bun", ["run", "build"], { cwd, stdio: "inherit" });
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build failed: ${cwd}`))));
  });
}

async function main() {
  // build x402-kit first; orchestrator-core depends on it
  const order = ["x402-kit", "capability-runtime", "orchestrator-core", "create-nexus-app"];
  const present = await readdir("packages");
  for (const pkg of order.filter((p) => present.includes(p))) {
    await runBuild(join("packages", pkg));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
