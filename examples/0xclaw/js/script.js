/* script.js — the words and the plan of the film. Everything else follows from this file
 * (js/lib/build.js explains every field).
 *
 * The talk follows Patrick Winston's "How to Speak": an empowerment promise up front, one slogan
 * ("A budget for every phase. A deadline it can feel.") on the title card and again after the second
 * controller, a fence around the idea, a question to the audience, and at the end the contributions
 * and one sentence that says what the work is (not "thank you").
 */
(function (root) {
  const SCENES = [
    {
      id: 's-hook', title: 'Hook', chapter: null, lead: 0.6, tail: 0.4,
      cues: [
        { id: 'give', dur: 5.0, en: 'Give this agent a hackathon link. It does the rest, by itself.' },
        { id: 'won', dur: 2.6, en: 'It took first place in its track.' },
        { id: 'promise', dur: 5.3, en: 'In four minutes: how it finishes an open-ended project on time and on budget.',
          full: { en: 'In five minutes: how it finishes an open-ended project on time and on budget.' } },
      ],
    },
    {
      id: 's-title', title: 'Title card', chapter: null, lead: 0.6, tail: 0.7,
      cues: [
        { id: 'name', dur: 7.4, en: 'This is 0xClaw. The idea: a budget for every phase, and a deadline the agent can feel.', say: 'This is Zero X Claw. The idea: a budget for every phase, and a deadline the agent can feel.' },
      ],
    },
    {
      id: 's-problem', title: '01 · The problem', chapter: 0, lead: 0.6, tail: 0.9,
      cues: [
        { id: 'harder', dur: 4.8, en: 'Agents do well with a clear target. A hackathon has none.' },
        { id: 'four', dur: 5.2, en: 'An open goal, a hard deadline, several deliverables — and one budget.' },
        { id: 'decide', dur: 5.8, en: 'Two questions decide everything: how to split the budget, and when to stop adding scope.' },
        { id: 'neither', dur: 2.4, gap: 0.6, en: 'Most agents answer neither.' },
        { id: 'fence', dur: 7.6, en: 'Budget methods cap one call. Multi-agent systems split roles. Nobody budgets the whole project.' },
        { id: 'hard', cut: 'full', dur: 9.2, en: 'Three things make that hard. Context keeps growing. Budgets are set per call. And agents have no sense of time.' },
      ],
    },
    {
      id: 's-pipeline', title: '02 · The workflow', chapter: 1, lead: 0.6, tail: 0.5,
      cues: [
        { id: 'seven', dur: 3.4, en: '0xClaw runs the project as seven fixed phases:', say: 'Zero X Claw runs the project as seven fixed phases:' },
        { id: 'names', dur: 7.2, en: 'research, idea, selection, planning, coding, testing, and documentation.' },
        { id: 'handoff', dur: 6.6, en: 'Each phase hands on one typed artifact, not the whole history, so the context stays small.' },
      ],
    },
    {
      id: 's-router', title: '03 · Budget Router', chapter: 2, lead: 0.6, tail: 0.6,
      cues: [
        { id: 'two', dur: 5.6, gap: 0.5, en: 'On top sit two small controllers: one for how much, one for how to behave.' },
        { id: 'model', dur: 8.0, en: 'First, the Budget Router: a two-billion-parameter model, fine-tuned on fifty thousand real hackathon projects.' },
        { id: 'token', dur: 8.4, gap: 0.6, en: 'Before each phase, it reads the workspace and writes one control token: tokens, time, thinking, and repairs.' },
        { id: 'data', cut: 'full', dur: 10.4, en: 'Its training data is HackRep: a hundred thousand hackathon repositories, filtered down to fifty-six thousand projects, each cut into seven phases.', say: 'Its training data is Hack Rep: a hundred thousand hackathon repositories, filtered down to fifty-six thousand projects, each cut into seven phases.' },
        { id: 'weak', cut: 'full', dur: 11.4, gap: 0.6, en: 'There are no budget labels. So we infer them from repository signals, relative to each project\'s own average. The router learns a pattern, not a size.' },
        { id: 'ask', dur: 3.6, gap: 1.2, en: 'Quick question: which phase should get the most?' },
        { id: 'learned', dur: 4.9, gap: 0.5, en: 'It learned: research needs the least. Coding, the most.' },
        { id: 'acc', dur: 7.0, en: 'It gets the whole token right 93% of the time. Prompting bigger models does not come close.', say: 'It gets the whole token right ninety-three percent of the time. Prompting bigger models does not come close.' },
        { id: 'perphase', cut: 'full', dur: 5.4, en: 'And that holds for every phase: above 0.91 on each of the seven.', say: 'And that holds for every phase: above zero point nine one on each of the seven.' },
      ],
    },
    {
      id: 's-framer', title: '04 · Deadline Framer', chapter: 3, lead: 0.6, tail: 1.2,
      cues: [
        { id: 'second', dur: 5.9, en: 'Second, the Deadline Framer. No training. No model call.' },
        { id: 'combine', dur: 5.8, en: 'It reads the token against what earlier phases really spent, and sets a pressure level.' },
        { id: 'write', dur: 5.6, en: 'Then it writes that pressure into the prompt as a plain sentence. No numbers.' },
        { id: 'narrow', dur: 6.0, en: 'Overspend, and the scope narrows: from a working MVP to the critical path only.', say: 'Overspend, and the scope narrows: from a working M V P to the critical path only.' },
        { id: 'loop', dur: 4.8, gap: 0.7, en: 'One loop per phase. And the agent itself never changes.' },
        { id: 'slogan', dur: 4.6, en: 'A budget for every phase. A deadline it can feel.' },
      ],
    },
    {
      id: 's-results', title: '05 · Results', chapter: 4, lead: 0.6, tail: 0.8,
      cues: [
        { id: 'setup', dur: 7.6, gap: 0.5, caps: 'each', en: 'Does it work? Twenty real hackathons. Ten other agents. One shared model underneath.' },
        { id: 'eval', cut: 'full', dur: 11.0, gap: 0.5, en: 'Quality is judged blind by a language model. Two hard checks back it up: the project must build and pass a smoke test, and it must do so on the first run.' },
        { id: 'pass', dur: 6.9, en: 'First, reliability. Its first run ships a working project, twenty times out of twenty.' },
        { id: 'tokens', dur: 7.1, en: 'Second, cost. The same quality as Claude Code, with 59% fewer tokens.', say: 'Second, cost. The same quality as Claude Code, with fifty-nine percent fewer tokens.' },
        { id: 'novelty', dur: 3.4, gap: 0.5, en: 'And the highest novelty score of all eleven systems.' },
        { id: 'cheaper', cut: 'full', dur: 6.0, gap: 0.5, en: 'Cheaper agents exist. They stop early, and score five to nine points lower.' },
        { id: 'stats', cut: 'full', dur: 10.8, gap: 0.5, en: 'Against ARIS, the second-best baseline, it wins thirteen tasks of twenty. Under a second judge it stays level with ARIS, behind only Claude Code.', say: 'Against Aris, the second-best baseline, it wins thirteen tasks of twenty. Under a second judge it stays level with Aris, behind only Claude Code.' },
        { id: 'ablation', dur: 5.0, gap: 0.5, en: 'Each controller helps on its own. Together, they are best.' },
        { id: 'tradeoff', dur: 8.2, gap: 0.5, en: 'The price is time: about two and a half times slower than ARIS. On standard coding benchmarks, nothing is lost.', say: 'The price is time: about two and a half times slower than Aris. On standard coding benchmarks, nothing is lost.' },
        { id: 'limits', cut: 'full', dur: 8.0, en: 'The limits: weak labels, twenty tasks, and a fixed phase order. Bounded backtracking comes next.' },
      ],
    },
    {
      id: 's-showcase', title: '06 · Showcase', chapter: 5, lead: 0.5, tail: 0.8,
      cues: [
        { id: 'what', dur: 1.8, en: 'So what does it build?' },
        { id: 'list', dur: 12.0, gap: 0.6, caps: 'each', breath: 1.0, en: 'A token launchpad. A cloud cost optimizer. Code search. A medical document decoder. A trip planner. A moonquake map.',
          full: { dur: 16.8, en: 'A token launchpad. A cloud cost optimizer. Code search. A medical document decoder. A trip planner. A moonquake map. A meme copilot. A note-taking vault.' } },
        { id: 'each', dur: 5.2, en: 'Researched, planned, coded, tested and documented by the agent.' },
      ],
    },
    {
      id: 's-outro', title: 'Use it · end card', chapter: null, lead: 0.6, tail: 3.6, full: { tail: 5.2 },
      cues: [
        { id: 'open', dur: 6.2, gap: 0.8, en: 'It is open source. Run it from a terminal or a chat app, and watch every phase.' },
        { id: 'contrib', dur: 8.2, gap: 0.6, en: 'We contribute a seven-phase pipeline, two controllers for budget and deadline, and evidence from twenty real hackathons.' },
        { id: 'ships', dur: 7.4, en: '0xClaw is the first to quantify open-ended hackathons and to compete in them autonomously.', say: 'Zero X Claw is the first to quantify open-ended hackathons, and to compete in them autonomously.' },
      ],
    },
  ];
  const FILM = {
    slug: '0xclaw_intro',
    title: '0xClaw: Autonomous Open-ended Agents with Phase-aware Budget Allocation and Temporal Pressure (EMNLP 2026)',
    beat: 0.6,
    cuts: ['4min', 'full'],                                  // only 'full' is maintained; '4min' = the cues without cut:'full'
    captions: ['en', 'zh'],
    chapters: ['Problem', 'Workflow', 'Budget Router', 'Deadline Framer', 'Results', 'Showcase'],
    posters: [{ name: 'poster_title', scene: 's-title', station: 0, at: -0.9 }, { name: 'poster_endcard', scene: 's-outro', station: 2, at: -1.6 }],
    scenes: SCENES,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FILM; else root.OXFILM = FILM;
})(typeof window !== 'undefined' ? window : globalThis);
