# @nexus/capability-runtime

Capability contracts and a schema-enforcing registry with tag-based routing.

```ts
import { CapabilityRegistry } from "@nexus/capability-runtime";

const reg = new CapabilityRegistry();
reg.register({ metadata: { key: "text.generate", tags: ["text"] }, input, output, execute });
await reg.invoke("text.generate", { prompt: "hi" }); // validates input + output
reg.byTag("text"); // routing
```
