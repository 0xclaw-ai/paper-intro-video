/* data.js — every number the film shows, in one place, each with where it comes from.
 * A film about a paper copies them from the camera-ready (say which table); nothing on screen is typed
 * a second time in the HTML. A schematic that is not measured data is labelled as one on screen.
 */
window.OXDATA = {
  rule: { words: 12 },                                       // the harness's own rule of thumb: a dozen words per screen
  // illustration only (the two tracks in the demo): where seven words sit in the plan, and where another voice puts them — in % of the track
  ticks: { plan: [3, 17, 31, 46, 61, 77, 93], voice: [3, 13, 22, 40, 51, 68, 80] },
};
