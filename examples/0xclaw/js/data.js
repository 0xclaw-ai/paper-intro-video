/* data.js — every number shown in the video, copied from the EMNLP 2026 camera-ready
 * (Tables 1, 3, 4, 5, 8 and Figure 5) and from the released controller code. */
window.OXDATA = {
  paper: {
    title: 'Autonomous Open-ended Agents with Phase-aware Budget Allocation and Temporal Pressure',
    authors: ['Yu Zhou*', 'Xinyuan Dou*', 'Yudong Cao', 'Junhao Song'],
    affiliations: 'Imperial College London · Zapata Quantum',
    venue: 'EMNLP 2026',
  },
  links: {
    github: 'github.com/0xclaw-ai/0xClaw',
    site: '0xclaw-ai.github.io',
    hf: 'huggingface.co/0xclaw-ai/budgetrouter-qwen3.5-2b-lora',
  },

  // Figure 1 — the seven phases. `files` are the handoff artifacts as the released code names them
  // (workspace/hackathon/…); `icon` is a Phosphor icon.
  phases: [
    { key: 'research', name: 'Research', icon: 'binoculars', files: ['context.json', 'research_summary.md'] },
    { key: 'idea', name: 'Idea', icon: 'lightbulb', files: ['ideas.json'] },
    { key: 'selection', name: 'Selection', icon: 'funnel', files: ['selected_idea.json'] },
    { key: 'planning', name: 'Planning', icon: 'blueprint', files: ['plan.md', 'tasks.json'] },
    { key: 'coding', name: 'Coding', icon: 'brackets-curly', files: ['project/'] },
    { key: 'testing', name: 'Testing', icon: 'test-tube', files: ['test_results.json'] },
    { key: 'documentation', name: 'Documentation', icon: 'book-open-text', files: ['submission/'] },
  ],

  // Eq. 5 — control tuple grammar (7 x 5 x 3 x 3 x 3 = 945 tuples). The example is one valid tuple.
  control: {
    example: ['PHASE_CODING', 'TOKEN_1.25X', 'TIME_HIGH', 'THINK_LOW', 'REPAIR_1'],
    fields: [
      { key: 'TOKEN', label: 'Tokens', icon: 'coins', options: ['0.25×', '0.5×', '0.75×', '1.0×', '1.25×'], pick: 4 },
      { key: 'TIME', label: 'Time', icon: 'timer', options: ['low', 'medium', 'high'], pick: 2 },
      { key: 'THINK', label: 'Thinking', icon: 'brain', options: ['off', 'low', 'high'], pick: 1 },
      { key: 'REPAIR', label: 'Repairs', icon: 'wrench', options: ['0', '1', '2'], pick: 1 },
    ],
  },

  // Figure 5 (left) — share of HackRep projects per TOKEN tier, by phase (%). Small unlabeled
  // slivers in the paper figure are the remainders to 100.
  tokenTier: [
    { phase: 'research', t075: 86, t100: 14, t125: 0 },
    { phase: 'idea', t075: 18, t100: 79, t125: 3 },
    { phase: 'selection', t075: 35, t100: 64, t125: 1 },
    { phase: 'planning', t075: 3, t100: 44, t125: 53 },
    { phase: 'coding', t075: 1, t100: 21, t125: 78 },
    { phase: 'testing', t075: 51, t100: 29, t125: 20 },
    { phase: 'documentation', t075: 4, t100: 57, t125: 39 },
  ],

  // Table 1 — Budget Router policy evaluation (Exact match, 0–1)
  router: [
    { name: 'Static default', exact: 0.3617 },
    { name: 'Phase majority', exact: 0.5260 },
    { name: 'Feature heuristic', exact: 0.4549 },
    { name: 'Lightweight ML', exact: 0.6656 },
    { name: 'Qwen3.5-2B zero-shot', exact: 0.0029 },
    { name: 'Qwen3.5-2B few-shot', exact: 0.3486 },
    { name: 'Budget Router (LoRA SFT)', exact: 0.9301, ours: true },
  ],
  routerFacts: { trainProjects: 50669, exact: 0.9301, avg: 0.9618, tokenMaeDrop: 81.4 },
  // the four bars of the accuracy screen: Table 1, plus the best prompted foundation model from
  // Appendix Table 6 (GPT-5.4-mini 0.0763, DeepSeek V4 Flash 0.2375, GLM-5.1 0.1155 — exact match)
  accuracy: [
    { name: 'Budget Router', exact: 0.9301, ours: true },
    { name: 'Best non-neural baseline', exact: 0.6656 },
    { name: 'Same model, prompted', exact: 0.3486 },
    { name: 'Bigger models, prompted', exact: 0.2375 },
  ],
  // Appendix A.1 — HackRep filtering
  hackrep: { repos: 100356, valid: 56311, train: 50669 },

  // Table 2 — per-phase exact match: the router vs. the strongest baseline without fine-tuning
  perPhase: [
    { phase: 'research', ours: 0.9210, base: 0.5810 },
    { phase: 'idea', ours: 0.9460, base: 0.7830 },
    { phase: 'selection', ours: 0.9390, base: 0.6900 },
    { phase: 'planning', ours: 0.9140, base: 0.5990 },
    { phase: 'coding', ours: 0.9390, base: 0.6960 },
    { phase: 'testing', ours: 0.9320, base: 0.6590 },
    { phase: 'documentation', ours: 0.9200, base: 0.6530 },
  ],
  // schematic only (not data): per-phase workload scores of one project, used to illustrate centering
  centering: [
    { label: 'res', h: 0.50 }, { label: 'idea', h: 0.42 }, { label: 'sel', h: 0.38 }, { label: 'plan', h: 0.68 },
    { label: 'code', h: 0.95 }, { label: 'test', h: 0.72 }, { label: 'doc', h: 0.55 },
  ],

  // Deadline Framer — pressure tiers and the real coding-phase templates (templates.py)
  tiers: [
    { scope: 'full scope', text: 'Implement thoroughly — include proper error handling, edge cases, clear naming, modular structure, and inline comments where helpful.' },
    { scope: 'core features', text: 'Implement all core features with basic error handling. Code should be clean and fully functional.' },
    { scope: 'working MVP', text: 'Deliver a working MVP. Prioritize functionality over polish — a working solution over a perfect one.' },
    { scope: 'critical path only', text: 'Implement the single most critical feature only. Skip everything else. Get something that runs.' },
    { scope: 'minimum executable', text: 'Write the absolute minimum that executes. One core function or script. No error handling, no extras, no comments.' },
  ],
  framerModifiers: {
    think: 'Execute directly. Skip extended reasoning — act immediately.',
    repair: 'One revision pass allowed after your initial implementation.',
  },

  // Table 3 — hackathon benchmark, Claude Opus 4.7 judge, 20 tasks
  agents: [
    { name: 'OpenClaw', gate: 16, quality: 72.6, tokens: 1.68, novelty: 49.7, pass1: 0.80 },
    { name: 'OpenHands', gate: 16, quality: 72.2, tokens: 2.19, novelty: 51.0, pass1: 0.80 },
    { name: 'OpenHands-Versa', gate: 11, quality: 69.5, tokens: 2.24, novelty: 50.0, pass1: 0.55 },
    { name: 'AI-Researcher', gate: 13, quality: 65.5, tokens: 1.15, novelty: 42.2, pass1: 0.65 },
    { name: 'ARIS', gate: 19, quality: 74.6, tokens: 4.32, novelty: 48.1, pass1: 0.95 },
    { name: 'Hermes-agent', gate: 15, quality: 72.7, tokens: 3.91, novelty: 48.7, pass1: 0.75 },
    { name: 'OpenCode', gate: 9, quality: 68.1, tokens: 0.89, novelty: 47.7, pass1: 0.45 },
    { name: 'Copilot CLI', gate: 18, quality: 71.4, tokens: 1.04, novelty: 49.8, pass1: 0.90 },
    { name: 'Claude Code', gate: 20, quality: 77.1, tokens: 9.17, novelty: 47.4, pass1: 1.00 },
    { name: 'Codex', gate: 10, quality: 67.9, tokens: 5.00, novelty: 49.9, pass1: 0.50 },
    { name: '0xClaw', gate: 20, quality: 77.0, tokens: 3.72, novelty: 51.9, pass1: 1.00, ours: true },
  ],

  // Section 5.3 — paired comparison with ARIS on per-task Quality (Wilcoxon p = 0.002, dz = 0.70)
  vsAris: { wins: 13, ties: 4, losses: 3 },
  // Table 7 — Quality under the second judge (GPT-5.5)
  secondJudge: [
    { name: 'Claude Code', quality: 85.7 },
    { name: '0xClaw', quality: 84.8, ours: true },
    { name: 'ARIS', quality: 84.8 },
  ],

  // Table 5 — ablation
  ablation: [
    { name: 'Native', br: false, df: false, gate: 18, quality: 75.0, tokens: 4.13, pass1: 0.90 },
    { name: 'DF-only', br: false, df: true, gate: 19, quality: 75.5, tokens: 3.25, pass1: 0.95 },
    { name: 'BR-only', br: true, df: false, gate: 20, quality: 76.9, tokens: 3.82, pass1: 1.00 },
    { name: 'BR + DF', br: true, df: true, gate: 20, quality: 77.0, tokens: 3.72, pass1: 1.00, ours: true },
  ],

  // Table 4 — external coding benchmarks (pass@1, 20 sampled tasks each)
  external: [
    { bench: 'Aider', ours: 1.00, opencode: 1.00, codex: 1.00 },
    { bench: 'CanItEdit', ours: 0.80, opencode: 0.75, codex: 0.75 },
    { bench: 'SWE-bench', ours: 0.90, opencode: 0.80, codex: 0.80 },
  ],

  // Figures 8 & 9 — projects produced by 0xClaw
  projects: [
    { key: 'tokenforge', name: 'TokenForge', what: 'AI token launchpad for the Bags Solana ecosystem', img: 'assets/projects/tokenforge.jpg', tags: ['Bags REST API', 'Solana', 'fee sharing'] },
    { key: 'costwise', name: 'Costwise', what: 'Prompts that find and fix AWS cost waste', img: 'assets/projects/costwise.jpg', tags: ['EC2 · S3 · Lambda · RDS', 'CloudFormation'] },
    { key: 'codesemantic', name: 'CodeSemantic', what: 'Code search that understands a codebase', img: 'assets/projects/codesemantic.jpg', tags: ['CodeBERT embeddings', 'vector DB'] },
    { key: 'clarify', name: 'Clarify', what: 'Medical document decoder for patients', img: 'assets/projects/clarify.jpg', tags: ['plain-language summaries', 'action plan'] },
    { key: 'wander', name: 'Wander', what: 'Trip planner that reasons about taste, time and weather', img: 'assets/projects/wander.jpg', tags: ['day-by-day itinerary', 'weather-aware'] },
    { key: 'lunar', name: 'Lunar Seismic Explorer', what: 'Interactive moonquake map from Apollo data', img: 'assets/projects/lunar.jpg', tags: ['Apollo seismic events', '3D globe'] },
    { key: 'mememind', name: 'Mememind', what: 'Chat-first generative meme copilot', img: 'assets/projects/mememind.jpg', tags: ['format + caption reasoning', 'image generation'] },
    { key: 'mindvault', name: 'MindVault', what: 'AI note-taking vault', img: 'assets/projects/mindvault.jpg', tags: ['notes + collections', 'AI-detected topics'] },
  ],
};
