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
        { id: 'give', dur: 5.0, en: 'Give this agent a hackathon link. It does the rest, by itself.', zh: '给这个智能体一个黑客松链接，剩下的它独立完成。' },
        { id: 'won', dur: 2.6, en: 'It took first place in its track.', zh: '它拿下了所在赛道的第一名。' },
        { id: 'promise', dur: 5.3, en: 'In four minutes: how it finishes an open-ended project on time and on budget.', zh: '接下来四分钟：它如何按时、按预算完成一个开放式项目。',
          full: { en: 'In five minutes: how it finishes an open-ended project on time and on budget.', zh: '接下来五分钟：它如何按时、按预算完成一个开放式项目。' } },
      ],
    },
    {
      id: 's-title', title: 'Title card', chapter: null, lead: 0.6, tail: 0.7,
      cues: [
        { id: 'name', dur: 7.4, en: 'This is 0xClaw. The idea: a budget for every phase, and a deadline the agent can feel.', say: 'This is Zero X Claw. The idea: a budget for every phase, and a deadline the agent can feel.', zh: '这就是 0xClaw。核心想法：每个阶段一份预算，一个智能体能感受到的期限。' },
      ],
    },
    {
      id: 's-problem', title: '01 · The problem', chapter: 0, lead: 0.6, tail: 0.9,
      cues: [
        { id: 'harder', dur: 4.8, en: 'Agents do well with a clear target. A hackathon has none.', zh: '目标明确时，智能体表现很好；而黑客松没有明确目标。' },
        { id: 'four', dur: 5.2, en: 'An open goal, a hard deadline, several deliverables — and one budget.', zh: '开放的目标、硬性的期限、多项交付物——以及唯一的一份预算。' },
        { id: 'decide', dur: 5.8, en: 'Two questions decide everything: how to split the budget, and when to stop adding scope.', zh: '两个问题决定成败：预算怎么分，以及何时停止扩张范围。' },
        { id: 'neither', dur: 2.4, gap: 0.6, en: 'Most agents answer neither.', zh: '大多数智能体，两个都答不上。' },
        { id: 'fence', dur: 7.6, en: 'Budget methods cap one call. Multi-agent systems split roles. Nobody budgets the whole project.', zh: '预算方法只限制单次调用，多智能体系统只划分角色；没有谁为整个项目做预算。' },
        { id: 'hard', cut: 'full', dur: 9.2, en: 'Three things make that hard. Context keeps growing. Budgets are set per call. And agents have no sense of time.', zh: '难点有三：上下文不断膨胀；预算只按单次调用设定；智能体没有时间感。' },
      ],
    },
    {
      id: 's-pipeline', title: '02 · The workflow', chapter: 1, lead: 0.6, tail: 0.5,
      cues: [
        { id: 'seven', dur: 3.4, en: '0xClaw runs the project as seven fixed phases:', say: 'Zero X Claw runs the project as seven fixed phases:', zh: '0xClaw 把项目拆成七个固定阶段：' },
        { id: 'names', dur: 7.2, en: 'research, idea, selection, planning, coding, testing, and documentation.', zh: '调研、创意、筛选、规划、编码、测试和文档。' },
        { id: 'handoff', dur: 6.6, en: 'Each phase hands on one typed artifact, not the whole history, so the context stays small.', zh: '每个阶段只交接一个类型化产物，而不是全部历史，上下文因此保持精简。' },
      ],
    },
    {
      id: 's-router', title: '03 · Budget Router', chapter: 2, lead: 0.6, tail: 0.6,
      cues: [
        { id: 'two', dur: 5.6, gap: 0.5, en: 'On top sit two small controllers: one for how much, one for how to behave.', zh: '在它之上是两个小控制器：一个决定给多少，一个决定怎么做。' },
        { id: 'model', dur: 8.0, en: 'First, the Budget Router: a two-billion-parameter model, fine-tuned on fifty thousand real hackathon projects.', zh: '第一个是 Budget Router：一个 20 亿参数的小模型，在五万个真实黑客松项目上微调。' },
        { id: 'token', dur: 8.4, gap: 0.6, en: 'Before each phase, it reads the workspace and writes one control token: tokens, time, thinking, and repairs.', zh: '每个阶段开始前，它读取工作区，写出一个控制 token：token 量、时间、思考强度和修复轮数。' },
        { id: 'data', cut: 'full', dur: 10.4, en: 'Its training data is HackRep: a hundred thousand hackathon repositories, filtered down to fifty-six thousand projects, each cut into seven phases.', say: 'Its training data is Hack Rep: a hundred thousand hackathon repositories, filtered down to fifty-six thousand projects, each cut into seven phases.', zh: '训练数据来自 HackRep：十万个黑客松仓库，过滤后剩五万六千个项目，每个再切成七个阶段。' },
        { id: 'weak', cut: 'full', dur: 11.4, gap: 0.6, en: 'There are no budget labels. So we infer them from repository signals, relative to each project\'s own average. The router learns a pattern, not a size.', zh: '数据里没有预算标签，于是我们从仓库信号中推断，并以每个项目自身的平均值为基准。路由器学到的是分配模式，而不是项目规模。' },
        { id: 'ask', dur: 3.6, gap: 1.2, en: 'Quick question: which phase should get the most?', zh: '先问一个问题：哪个阶段应该拿到最多预算？' },
        { id: 'learned', dur: 4.9, gap: 0.5, en: 'It learned: research needs the least. Coding, the most.', zh: '它学到的是：调研最少，编码最多。' },
        { id: 'acc', dur: 7.0, en: 'It gets the whole token right 93% of the time. Prompting bigger models does not come close.', say: 'It gets the whole token right ninety-three percent of the time. Prompting bigger models does not come close.', zh: '它有 93% 的概率把整个 token 写对；提示更大的模型也远远做不到。' },
        { id: 'perphase', cut: 'full', dur: 5.4, en: 'And that holds for every phase: above 0.91 on each of the seven.', say: 'And that holds for every phase: above zero point nine one on each of the seven.', zh: '而且每个阶段都是如此：七个阶段全部高于 0.91。' },
      ],
    },
    {
      id: 's-framer', title: '04 · Deadline Framer', chapter: 3, lead: 0.6, tail: 1.2,
      cues: [
        { id: 'second', dur: 5.9, en: 'Second, the Deadline Framer. No training. No model call.', zh: '第二个是 Deadline Framer：不用训练，也不调用模型。' },
        { id: 'combine', dur: 5.8, en: 'It reads the token against what earlier phases really spent, and sets a pressure level.', zh: '它把 token 和前面各阶段的实际消耗对照，定出一个压力等级。' },
        { id: 'write', dur: 5.6, en: 'Then it writes that pressure into the prompt as a plain sentence. No numbers.', zh: '再把这份压力写进提示词——一句直白的话，没有任何数字。' },
        { id: 'narrow', dur: 6.0, en: 'Overspend, and the scope narrows: from a working MVP to the critical path only.', say: 'Overspend, and the scope narrows: from a working M V P to the critical path only.', zh: '一旦超支，范围就收窄：从可用的 MVP，缩到只做关键路径。' },
        { id: 'loop', dur: 4.8, gap: 0.7, en: 'One loop per phase. And the agent itself never changes.', zh: '每个阶段循环一次，而智能体本身始终不变。' },
        { id: 'slogan', dur: 4.6, en: 'A budget for every phase. A deadline it can feel.', zh: '每个阶段一份预算，一个它能感受到的期限。' },
      ],
    },
    {
      id: 's-results', title: '05 · Results', chapter: 4, lead: 0.6, tail: 0.8,
      cues: [
        { id: 'setup', dur: 7.6, gap: 0.5, caps: 'each', en: 'Does it work? Twenty real hackathons. Ten other agents. One shared model underneath.', zh: '有效吗？二十场真实黑客松。十个对比智能体。同一个底座模型。' },
        { id: 'eval', cut: 'full', dur: 11.0, gap: 0.5, en: 'Quality is judged blind by a language model. Two hard checks back it up: the project must build and pass a smoke test, and it must do so on the first run.', zh: '质量由大模型盲评，并有两项硬指标佐证：项目必须能构建并通过冒烟测试，而且要在首次运行时就做到。' },
        { id: 'pass', dur: 6.9, en: 'First, reliability. Its first run ships a working project, twenty times out of twenty.', zh: '第一，可靠性：首次运行就交付可用项目，二十次全部成功。' },
        { id: 'tokens', dur: 7.1, en: 'Second, cost. The same quality as Claude Code, with 59% fewer tokens.', say: 'Second, cost. The same quality as Claude Code, with fifty-nine percent fewer tokens.', zh: '第二，成本：与 Claude Code 相同的质量，token 少用 59%。' },
        { id: 'novelty', dur: 3.4, gap: 0.5, en: 'And the highest novelty score of all eleven systems.', zh: '并且在全部十一个系统中，新颖性得分最高。' },
        { id: 'cheaper', cut: 'full', dur: 6.0, gap: 0.5, en: 'Cheaper agents exist. They stop early, and score five to nine points lower.', zh: '更省的智能体也有，但它们提前收工，质量低五到九分。' },
        { id: 'stats', cut: 'full', dur: 10.8, gap: 0.5, en: 'Against ARIS, the second-best baseline, it wins thirteen tasks of twenty. Under a second judge it stays level with ARIS, behind only Claude Code.', say: 'Against Aris, the second-best baseline, it wins thirteen tasks of twenty. Under a second judge it stays level with Aris, behind only Claude Code.', zh: '对比第二强的基线 ARIS，二十个任务中它赢下十三个；换一个裁判，它仍与 ARIS 持平，仅次于 Claude Code。' },
        { id: 'ablation', dur: 5.0, gap: 0.5, en: 'Each controller helps on its own. Together, they are best.', zh: '两个控制器各自有效，合在一起最好。' },
        { id: 'tradeoff', dur: 8.2, gap: 0.5, en: 'The price is time: about two and a half times slower than ARIS. On standard coding benchmarks, nothing is lost.', say: 'The price is time: about two and a half times slower than Aris. On standard coding benchmarks, nothing is lost.', zh: '代价是时间：大约比 ARIS 慢两倍半。而在标准编程基准上，没有任何损失。' },
        { id: 'limits', cut: 'full', dur: 8.0, en: 'The limits: weak labels, twenty tasks, and a fixed phase order. Bounded backtracking comes next.', zh: '局限在于：弱监督标签、二十个任务、固定的阶段顺序。下一步是有界回溯。' },
      ],
    },
    {
      id: 's-showcase', title: '06 · Showcase', chapter: 5, lead: 0.5, tail: 0.8,
      cues: [
        { id: 'what', dur: 1.8, en: 'So what does it build?', zh: '那么，它做出了什么？' },
        { id: 'list', dur: 12.0, gap: 0.6, caps: 'each', breath: 1.0, en: 'A token launchpad. A cloud cost optimizer. Code search. A medical document decoder. A trip planner. A moonquake map.', zh: '代币发射台、云成本优化器、代码搜索、医疗文档解读、行程规划器、月震地图。',
          full: { dur: 16.8, en: 'A token launchpad. A cloud cost optimizer. Code search. A medical document decoder. A trip planner. A moonquake map. A meme copilot. A note-taking vault.', zh: '代币发射台、云成本优化器、代码搜索、医疗文档解读、行程规划器、月震地图、表情包助手、笔记知识库。' } },
        { id: 'each', dur: 5.2, en: 'Researched, planned, coded, tested and documented by the agent.', zh: '调研、规划、编码、测试、文档，全部由智能体完成。' },
      ],
    },
    {
      id: 's-outro', title: 'Use it · end card', chapter: null, lead: 0.6, tail: 3.6, full: { tail: 5.2 },
      cues: [
        { id: 'open', dur: 6.2, gap: 0.8, en: 'It is open source. Run it from a terminal or a chat app, and watch every phase.', zh: '它已经开源。在终端或聊天应用里运行，就能看到每一个阶段。' },
        { id: 'contrib', dur: 8.2, gap: 0.6, en: 'We contribute a seven-phase pipeline, two controllers for budget and deadline, and evidence from twenty real hackathons.', zh: '我们的贡献：一条七阶段流水线，两个分别管预算和期限的控制器，以及二十场真实黑客松的证据。' },
        { id: 'ships', dur: 7.4, en: '0xClaw is the first to quantify open-ended hackathons and to compete in them autonomously.', say: 'Zero X Claw is the first to quantify open-ended hackathons, and to compete in them autonomously.', zh: '0xClaw 是首个把开放式的黑客松量化、并能自主参赛的工作。' },
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
