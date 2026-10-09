# Every claim in the film, against the paper

Source: [the camera-ready paper](https://arxiv.org/abs/2607.02799), DOI
[10.1007/978-3-032-37252-9_33](https://doi.org/10.1007/978-3-032-37252-9_33).
TeX line references below are retained from the authors' ledger dated 2026-10-09; sections and tables
are the public lookup points. These are paper-reported results, not new measurements of the release. Narration
lines are quoted from `js/script.js`; on-screen text from `index.html` and `js/data.js`. Re-check this table
after any change to the script or to the numbers.

## Narration

| Scene | Line (as captioned) | Source | Status |
|---|---|---|---|
| open | One sentence goes in. | abstract (140): "from a single textual prompt"; Task definition (209–220) | holds (v1.2 wording, see below) |
| open | Out come three different conversations. In each, two people speak, listen and answer each other. | Published film shows three pairs beside one prompt; identity provenance is not established for every pair | qualified; see opening-caption limitation below |
| open | Here is how one line of text becomes a two-person audio-visual dialogue. | abstract | holds |
| title | This is CHAT, from ECCV 2026. / Both sides of a conversation, from one sentence. | venue; abstract | holds |
| need | Virtual agents and digital humans learn to converse from data: recordings of two people talking. | abstract (140); intro (150) | holds |
| need | Collecting them is slow, costly and ethically sensitive, so the datasets stay small. | abstract: "time-consuming, expensive, and ethically sensitive"; intro: "existing DIAD datasets possess limited size" | holds |
| fence | Existing methods need more than text: a face video, a real speaker to react to, or the whole conversation given in advance. | Fig. 1 caption (b)–(d); intro para 2: "driven by pre-defined conversational speeches/transcripts" | fixed in v1.1 (v1 said every method "starts from something recorded", but transcripts are not recordings) |
| fence | CHAT starts from text alone. | Fig. 1 caption: "without requiring pre-defined video or audio inputs" | holds |
| fence | We call this task DIADG: from one prompt, generate many different dialogue pairs that respond to each other. | Task definition, Eq. 1 | holds |
| pipe | It works in three stages. / First, a language model writes the dialogue, five to ten turns, and describes both speakers. | TDG (241, 244) | holds |
| pipe | Next, the script becomes speech: two voices on one shared timeline. | DADG (246): odd/even sentences with silent segments of equal length | holds |
| pipe | Last, both faces are generated, then refined so that each one responds to the other. | IFBG (254) | fixed in v1.1 ("refined until" implied an iterative stopping rule) |
| audio | Before any voice is synthesised, the script is marked up: short replies like "uh-huh", an emotion for every sentence, the timing, and the sound environment. | IAR (i)–(iv) (275–290); emotion per sentence (254) | fixed in v1.1 ("the sound of the room": the paper's examples are "studio or open space") |
| audio | So the listener can react out loud without taking the turn. | DADG (254): interactive words inserted "to silent segments ... when the conversational partner is speaking" | holds |
| listen | While one person speaks, what should the other one be doing? / Listening. And listening is behaviour, too. | IFBR (i): "synthesise facial behaviours of silent segments" | holds |
| listen | One module generates the listener's face during every silence. | SFBG, IFBR (i) | fixed in v1.1 ("so the listener never freezes" claimed more than the ablation shows: without SFBG the paper interpolates) |
| listen | Another conditions each face on its partner, so its reactions answer what the other person does. | RFBG, IFBR (ii): partner window k-1:k+1 | fixed in v1.1 ("every reaction follows what the other just did" was too strong and ignored the k+1 window) |
| listen | A final step blends the seams between talking and listening. | TCR, IFBR (iii) | holds |
| results | Does it work? Against five methods built for related tasks, CHAT is best on six of eight metrics and second on the other two. | Table "Quantitative results" (398–429), text (499) | holds: best FID, LSE-C, LSE-D, FRCorr, FRDiv, CSIM; second FVD, LPIPS |
| results | Sixty people rated the clips. CHAT scored highest on all five aspects. | 505; Table "user study" (431–453) | holds |
| surprise | Remove only the partner module, and the reaction score nearly halves. | Table "Ablation" (455–495): FRCorr 50.02 to 25.78 (x 0.515) | holds |
| surprise | Viewers notice too: interactivity drops from 4.8 to 2.1. | Table "Ablation user study" (525–556), Inter. column | holds |
| styles | The same pipeline works for stylised faces, too. | IFBG (254): "photorealistic and stylised identities"; demo pair C | holds |
| data | Run at scale, CHAT produced CHAT-AVD-50k: 50,000 dialogue pairs and 100,000 synthetic identities. | 262 | holds |
| data | That is nearly 1,400 hours of video. (spoken: "fourteen hundred") | 262: "(100,000 clips, 1388.9 hours)" | fixed in v1.1 (v1 said "of conversation"; the hours count 100,000 clips, so conversation time may be half) |
| data | Used for pre-training, it improves two facial reaction models on REACT 2024. | 563–565; Table "Downstream IHG" (568–584) | holds; the screen keeps the paper's caveat (IFBR is pre-trained on REACT 2024) |
| release | The code and weights are public. These clips come from that release. | github.com/Rqcker/chat (RFBG and SFBG weights) | holds; on screen for the whole segment: "Public CHAT code. Identities from the HDTF dataset." |
| end | A new task. A framework with interactive audio and facial refinement. A dataset of 50,000 pairs. (spoken: "fifty thousand") | contributions (180–186) | holds; the dataset is not claimed to be downloadable |
| end | CHAT turns one sentence into a conversation in which both people speak, listen and respond. | abstract | holds |

## Numbers on screen

FID 17.33, FVD 365.03, LSE-C 6.89, LSE-D 8.07, FRCorr 50.02 (x10^-2), FRDiv 15.34 (x10^-2), CSIM 0.85, LPIPS 0.38
with ranks 1,2,1,1,1,1,1,2; baselines Hallo3, SadTalker, DIM, EDTalk, ReactDiff; mean of 1000 samples.
User study: 60 participants; 4.6, 4.8, 4.6, 4.6, 4.8. Ablation: 50.02 vs 25.78; 4.8 vs 2.1. Dataset: 50,000; 100,000;
1,388.9 hours. Downstream FRCorr: PerFRDiff 37.21 to 40.11, ReactDiff 24.19 to 26.12. Task: Eq. 1. TDG: 5–10 turns;
example descriptors "a thoughtful gentleman", "a vibrant lady" (241). Every value checked against main.tex by script.
v1.1 added the x10^-2 unit to the FRCorr and FRDiv tiles, which v1 left out.

## The cold open (settled 2026-10-09)

v1.1 said one sentence "is the whole input" over pairs A and B. That is the paper's method (identities come from
text descriptors through Arc2Face, 254), but how the identities of all source pairs were made is not on
record. The user chose "One sentence goes in." (v1.2): it says what the viewer sees, a prompt being entered, and
does not claim that nothing else went into those pairs.

## On screen, not spoken (v1.2)

- The ECCV 2026 logo is the conference's own vector logo with its paths unchanged: reversed for the navy title
  and end cards (lettering "ECCV 2026 | MALMÖ | SEPT 8-12"), and in the corner of the light pages the skyline
  alone in the logo's poster colours, beside the words "ECCV 2026".
- The x10^-2 units are set as superscripts in the numbers' own typeface; values unchanged.
- Captions (v1.3) write numbers above ten as numerals, as the dataset line already did: "nearly 1,400 hours",
  "50,000 pairs". The voice still says them in words; only the caption text changed.

## The opening caption (open, 2026-10-09)

The caption "Three pairs generated by CHAT from the same sentence" (about 0:09 to 0:15, under pairs A, B and C) is
misleading in the user's judgement: how the identities of pairs A and B were made is not on record, so it claims more
than is known, for the same reason as the cold open above. It is still in the uploaded film (youtu.be/9C436tP0OEA);
removing it means a re-render and a new upload with a new URL, which is the user's decision. Meanwhile no cover,
thumbnail, card or post uses that frame or that sentence.

## Teaching-copy differences

The published film remains unchanged. This example omits all demo footage and its sound, showing labelled
plates instead. Its opening caption reads "Demo footage omitted from this source example". The narration
and paper-reported numbers are retained to demonstrate timing and layout, not to claim that plates are
model outputs. The published opening caption must not be reused in a cover or promotional claim.
