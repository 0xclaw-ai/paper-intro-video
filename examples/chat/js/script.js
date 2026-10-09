/* script.js — the words and the plan of the CHAT film (js/lib/build.js explains every field).
 *
 * A talk, not a paper: a cold open that shows what happens and promises the rest, one slogan that
 * returns, a fence (what others need and CHAT does not), a question to the viewer, a surprise, and an
 * end that says what the work is. Third person throughout, except "we" once, where the paper defines
 * the task. Acronyms are on screen only; the voice says plain names. `say` spells out what a voice
 * would stumble over. Every claim and number is in js/data.js with its place in the paper.
 *
 * In the published film, two scenes end with generated dialogue and its sound.
 * This source example retains the timing but replaces footage with labelled plates:
 *   s-listen -> pair B speaking and answering (7.8 s);  s-styles -> the stylised pair C (6.5 s).
 */
(function (root) {
  const FILM = {
    slug: 'chat_intro',
    title: 'CHAT: Conversational Human Audio-visual Talking Dialogue Generation (ECCV 2026)',
    beat: 0.6,
    chapters: ['The problem', 'How it works', 'Does it work?'],
    posters: [{ name: 'poster_title', scene: 's-title', station: 0, at: -0.6 }, { name: 'poster_end', scene: 's-end', station: 0, at: -1.0 }],
    scenes: [
      {
        id: 's-open', youtube: 'One sentence in', title: 'Cold open', chapter: null, lead: 3.0, tail: 0.8,
        cues: [
          { id: 'input', dur: 1.8, en: 'One sentence goes in.' },
          { id: 'out', dur: 6.0, en: 'Out come three different conversations. In each, two people speak, listen and answer each other.' },
          { id: 'promise', dur: 5.0, en: 'Here is how one line of text becomes a two-person audio-visual dialogue.' },
        ],
      },
      {
        id: 's-title', title: 'Title card', chapter: null, lead: 0.6, tail: 1.2,
        cues: [
          { id: 'name', dur: 2.6, en: 'This is CHAT, from ECCV 2026.', say: 'This is Chat, from E C C V twenty twenty-six.' },
          { id: 'slogan', dur: 3.2, en: 'Both sides of a conversation, from one sentence.' },
        ],
      },
      {
        id: 's-need', youtube: 'The problem', title: 'Why it matters', chapter: 0, lead: 0.6, tail: 0.6,
        cues: [
          { id: 'need', dur: 5.6, en: 'Virtual agents and digital humans learn to converse from data: recordings of two people talking.' },
          { id: 'cost', dur: 5.4, en: 'Collecting them is slow, costly and ethically sensitive, so the datasets stay small.' },
        ],
      },
      {
        id: 's-fence', youtube: 'What other methods need', title: 'What others need', chapter: 0, lead: 0.6, tail: 0.8,
        cues: [
          { id: 'fence', dur: 8.2, breath: 0.6, en: 'Existing methods need more than text: a face video, a real speaker to react to, or the whole conversation given in advance.' },
          { id: 'only', dur: 2.2, gap: 0.6, en: 'CHAT starts from text alone.', say: 'Chat starts from text alone.' },
          { id: 'task', dur: 6.6, en: 'We call this task DIADG: from one prompt, generate many different dialogue pairs that respond to each other.',
            say: 'We call this task D I eh D G: from one prompt, generate many different dialogue pairs that respond to each other.' },
        ],
      },
      {
        id: 's-pipe', youtube: 'Three stages', title: 'Three stages', chapter: 1, lead: 0.6, tail: 0.8,
        cues: [
          { id: 'stages', dur: 1.8, en: 'It works in three stages.' },
          { id: 'text', dur: 5.6, en: 'First, a language model writes the dialogue, five to ten turns, and describes both speakers.' },
          { id: 'voice', dur: 4.2, en: 'Next, the script becomes speech: two voices on one shared timeline.' },
          { id: 'faces', dur: 5.2, en: 'Last, both faces are generated, then refined so that each one responds to the other.' },
        ],
      },
      {
        id: 's-audio', youtube: 'Marking up the script', title: 'Marking up the script', chapter: 1, lead: 0.6, tail: 0.8,
        cues: [
          { id: 'markup', dur: 3.8, en: 'Before any voice is synthesised, the script is marked up:' },
          { id: 'marks', dur: 6.4, breath: 0.5, en: 'short replies like “uh-huh”, an emotion for every sentence, the timing, and the sound environment.',
            say: 'short replies like uh huh, an emotion for every sentence, the timing, and the sound environment.' },
          { id: 'why', dur: 4.0, en: 'So the listener can react out loud without taking the turn.' },
        ],
      },
      {
        id: 's-listen', youtube: 'The listener', title: 'The listener', chapter: 1, lead: 0.6, tail: 9.0,
        cues: [
          { id: 'ask', dur: 3.8, gap: 1.4, en: 'While one person speaks, what should the other one be doing?' },
          { id: 'answer', dur: 2.6, en: 'Listening. And listening is behaviour, too.' },
          { id: 'silent', dur: 5.0, en: 'One module generates the listener’s face during every silence.', say: "One module generates the listener's face during every silence." },
          { id: 'partner', dur: 5.8, en: 'Another conditions each face on its partner, so its reactions answer what the other person does.' },
          { id: 'seams', dur: 3.6, en: 'A final step blends the seams between talking and listening.' },
        ],
      },
      {
        id: 's-results', youtube: 'Does it work?', title: 'Results', chapter: 2, lead: 0.6, tail: 0.8,
        cues: [
          { id: 'does', dur: 1.4, gap: 0.6, en: 'Does it work?' },
          { id: 'metrics', dur: 7.4, en: 'Against five methods built for related tasks, CHAT is best on six of eight metrics and second on the other two.',
            say: 'Against five methods built for related tasks, Chat is best on six of eight metrics and second on the other two.' },
          { id: 'people', dur: 4.6, en: 'Sixty people rated the clips. CHAT scored highest on all five aspects.',
            say: 'Sixty people rated the clips. Chat scored highest on all five aspects.' },
        ],
      },
      {
        id: 's-surprise', youtube: 'Remove one module', title: 'Remove one module', chapter: 2, lead: 0.6, tail: 1.0,
        cues: [
          { id: 'remove', dur: 4.2, gap: 0.6, en: 'Remove only the partner module, and the reaction score nearly halves.' },
          { id: 'viewers', dur: 4.4, en: 'Viewers notice too: interactivity drops from 4.8 to 2.1.',
            say: 'Viewers notice too: interactivity drops from four point eight to two point one.' },
        ],
      },
      {
        id: 's-styles', youtube: 'Stylised faces', title: 'Stylised identities', chapter: 2, lead: 0.6, tail: 7.4,
        cues: [
          { id: 'styles', dur: 3.0, en: 'The same pipeline works for stylised faces, too.' },
        ],
      },
      {
        id: 's-data', youtube: 'CHAT-AVD-50k', title: 'CHAT-AVD-50k', chapter: 2, lead: 0.6, tail: 0.8,
        cues: [
          { id: 'scale', dur: 6.0, en: 'Run at scale, CHAT produced CHAT-AVD-50k: 50,000 dialogue pairs and 100,000 synthetic identities.',
            say: 'Run at scale, Chat produced Chat A-V-D fifty K: fifty thousand dialogue pairs and a hundred thousand synthetic identities.' },
          { id: 'hours', dur: 3.0, en: 'That is nearly 1,400 hours of video.', say: 'That is nearly fourteen hundred hours of video.' },
          { id: 'transfer', dur: 4.8, en: 'Used for pre-training, it improves two facial reaction models on REACT 2024.',
            say: 'Used for pre-training, it improves two facial reaction models on React twenty twenty-four.' },
        ],
      },
      {
        id: 's-release', youtube: 'The public release', title: 'The public release', chapter: 2, lead: 0.6, tail: 4.2,
        cues: [
          { id: 'release', dur: 4.4, en: 'The code and weights are public. These clips come from that release.' },
        ],
      },
      {
        id: 's-end', youtube: 'Summary and links', title: 'End card', chapter: null, lead: 0.6, tail: 5.0,
        cues: [
          { id: 'sum', dur: 6.4, caps: 'each', breath: 0.6, en: 'A new task. A framework with interactive audio and facial refinement. A dataset of 50,000 pairs.',
            say: 'A new task. A framework with interactive audio and facial refinement. A dataset of fifty thousand pairs.' },
          { id: 'what', dur: 5.4, en: 'CHAT turns one sentence into a conversation in which both people speak, listen and respond.',
            say: 'Chat turns one sentence into a conversation in which both people speak, listen and respond.' },
        ],
      },
    ],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FILM; else root.OXFILM = FILM;
})(typeof window !== 'undefined' ? window : globalThis);
