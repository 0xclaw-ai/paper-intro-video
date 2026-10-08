/* script.js — the words and the plan of the film. Everything else follows from this file
 * (js/lib/build.js explains every field).
 *
 * Write it like a talk, not like a paper: an opening that says what the viewer will get, one idea per
 * line, short sentences that can be said in one breath, and an ending that says what the work is
 * (never "thank you"). Each cue is one narration line: the caption is `en`, the voice says `say`
 * (spell out what a voice would stumble over), and `dur` is your guess of how long it takes — once a
 * voice exists, the line lasts as long as it is really spoken.
 */
(function (root) {
  const FILM = {
    slug: 'demo',                                            // output files: out/demo.mp4, out/demo_captions_en.mp4
    title: 'A film that follows its voice (template demo)',
    beat: 0.6,
    chapters: ['How it works'],                              // the segments of the bar at the bottom; scenes point at them
    posters: [{ name: 'poster_title', scene: 's-title', station: 0, at: -0.8 }, { name: 'poster_end', scene: 's-end', station: 0, at: -1.2 }],
    scenes: [
      {
        id: 's-title', title: 'Title card', chapter: null, lead: 0.6, tail: 0.8,
        cues: [
          { id: 'open', dur: 4.4, en: 'This film is a web page. Every frame is a function of time.' },
        ],
      },
      {
        id: 's-how', title: 'How it works', chapter: 0, lead: 0.6, tail: 0.9,
        cues: [
          { id: 'steps', dur: 6.2, en: 'First come the words. Then a voice. Then the pictures, timed to the words.' },
          { id: 'follow', dur: 4.6, gap: 0.6, en: 'Change the voice, and the captions and the pictures follow.' },
          { id: 'rule', dur: 4.4, en: 'One idea per screen. 12 words at most.', say: 'One idea per screen. Twelve words at most.' },
        ],
      },
      {
        id: 's-end', title: 'End card', chapter: null, lead: 0.6, tail: 3.0,
        cues: [
          { id: 'yours', dur: 3.4, en: 'Now replace these scenes with your own.' },
        ],
      },
    ],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FILM; else root.OXFILM = FILM;
})(typeof window !== 'undefined' ? window : globalThis);
