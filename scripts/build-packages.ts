import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

async function runBuild(cwd: string) {
  return await new Promise<void>((resolve, reject) => {
    const proc = spawn("bun", ["run", "build"], { cwd, stdio: "inherit" });
    proc.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`build failed: ${cwd}`)));
  });
}

async function main() {
  const packages = await readdir("packages");
  for (const pkg of packages) {
    await runBuild(join("packages", pkg));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
