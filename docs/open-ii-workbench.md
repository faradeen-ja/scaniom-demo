# Open Immune Lab Fabric Workbench

Open Immune is the public engineering experience for learning and building real Scaniom Immune Fabric. A user selects a **Lab or system blueprint**, inspects the expected architecture, then starts the Lab and works through the real Scaniom runbook for that system.

## Entry model

```text
Select Lab / system blueprint
        ↓
manifest defines expected architecture + runtime surfaces
        ↓
preview architecture without changing real state
        ↓
START LAB
        ↓
VS Code-like Fabric Tree
        ↓
Fabric Matrix topology
        ↓
Inspector shows where to work + exact Scaniom action
        ↓
Intelligence shows CLI parity, behavior and evidence as integrations come online
```

The workbench fills the viewport below the persistent Open Immune header. The page itself does not vertically scroll; Tree, Inspector, catalog and Intelligence use their own internal scrolling where needed.

## Lab library

The catalog includes the executable public D00–D12 Labs plus Flagship and five system blueprints retained from the earlier Open Immune engineering build:

- AI SaaS Operations Center — L1 + L2 + MCP
- Robot Fleet — L2 + L4 + L5 + MCP
- Autonomous Lanes — L1 + L2 + L5 + L6
- AI Inference Factory — L3 + L4 + L5
- IFOC — all seven attachment boundaries

Selecting another Lab replaces the architecture, Tree and Matrix. Open Immune does not show every Scaniom concept in every Lab.

## Truth rule

Green / `DONE` is reserved for state Open Immune can prove from real Scaniom authority.

OIS Auth can prove:

- Control profile,
- operator identity,
- organization,
- selected environment,
- selected workload.

Node, policy, provider route, attachment execution, real traffic, Gate, trajectory, continuity and proof become `NEXT` or `LOCKED` according to Lab prerequisites but are **not** marked done until real evidence exists.

## Why manifests

`lib/open-ii/labs.ts` owns Lab/system definitions, including:

- relevant fabric steps,
- dependency order,
- where each step happens (terminal, IDE, Node host, Docker/Kubernetes, provider/runtime),
- required public Scaniom artifact,
- attachment set,
- platform/provider stack,
- topology nodes/edges,
- real Scaniom commands and integration code,
- completion source,
- suggested environment/workload names.

This keeps one workbench shell instead of hardcoding a different UI for every Lab.
