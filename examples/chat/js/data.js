/* data.js — every number and name the film shows, each with where it comes from.
 * Source of truth: the camera-ready paper, https://arxiv.org/abs/2607.02799 (original TeX line references retained).
 * Nothing on screen is typed a second time in the HTML; js/scenes.js reads it from here.
 */
window.OXDATA = {
  paper: {
    title: 'Conversational Human Audio-visual Talking Dialogue Generation',
    venue: 'European Conference on Computer Vision',
    venueShort: 'ECCV 2026',
    doi: '10.1007/978-3-032-37252-9_33',                       // Springer chapter, pp. 597-616
    links: { project: 'junhaosong.com/chat', code: 'github.com/Rqcker/chat', paper: 'doi.org/10.1007/978-3-032-37252-9_33' },
  },
  // https://github.com/Rqcker/chat (author list) (same order and numbering as the paper and the poster); no dagger on screen
  authors: [
    ['Junhao Song', '1'], ['Lluis Guasch', '1'], ['Xilin He', '2'], ['Zhongyu Yang', '3'], ['Yingfang Yuan', '4'], ['Weicheng Xie', '5'],
    ['Linlin Shen', '5'], ['Haijun Lin', '6'], ['Shizhe Liu', '7'], ['Wei Pang', '3'], ['Siyang Song', '8'],
  ],
  affiliations: ['Imperial College London', 'Mohamed bin Zayed University of Artificial Intelligence', 'Heriot-Watt University',
    'Northumbria University', 'Shenzhen University', 'Hunan Normal University', 'University of Oxford', 'University of Exeter'],

  // prompt shown in the published film; source footage is not distributed in this example
  prompt: 'A woman and a man are talking about their recent life experiences and weekend plans.',

  // main.tex:244 (TDG) and :285 (IAR interactive words); :241 the identity descriptor example
  turns: '5–10',
  backchannels: ['uh-huh', 'hmm', 'okay', 'yeah'],

  // Table "Quantitative results" (tab:quantitative_results, main.tex:398-429): mean of 1000 samples
  table1: {
    metrics: [
      // [name, better, CHAT, rank among 6 methods]
      ['FID', 'lower', '17.33', 1], ['FVD', 'lower', '365.03', 2], ['LSE-C', 'higher', '6.89', 1], ['LSE-D', 'lower', '8.07', 1],
      ['FRCorr', 'higher', '50.02', 1], ['FRDiv', 'higher', '15.34', 1], ['CSIM', 'higher', '0.85', 1], ['LPIPS', 'lower', '0.38', 2],
    ],
    best: 6, second: 2, baselines: ['Hallo3', 'SadTalker', 'DIM', 'EDTalk', 'ReactDiff'], samples: 1000,
  },
  // Table "Qualitative user study results" (tab:user_study, main.tex:431-453); 60 participants (main.tex:391, :505)
  study: { participants: 60, aspects: [['Visual', '4.6'], ['Audio', '4.8'], ['Sync', '4.6'], ['Expr.', '4.6'], ['Interact.', '4.8']] },
  // Table "Ablation quantitative analysis" (tab:ablation_quantitative, main.tex:455-495); FRCorr in units of 1e-2
  ablation: { full: '50.02', noRFBG: '25.78', studyFull: '4.8', studyNoRFBG: '2.1' },   // study: tab:ablation_user_study, Inter. column
  // CHAT-AVD-50k (main.tex:262); release promise main.tex:595
  dataset: { pairs: 50000, clips: 100000, hours: '1388.9', identities: 100000,
    scenarios: ['casual', 'professional', 'emotional', 'academic', 'social'] },
  // Table "Downstream IHG" (tab:ihg_downstream, main.tex:568-584); caveat main.tex:563
  downstream: { PerFRDiff: ['37.21', '40.11'], ReactDiff: ['24.19', '26.12'],
    caveat: 'IFBR is itself pre-trained on REACT 2024, so this is augmentation over a related distribution.' },
};
