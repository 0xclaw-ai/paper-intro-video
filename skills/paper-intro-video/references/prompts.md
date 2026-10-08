# Prompts: starting a film, steering it, reading feedback

Two halves. The first is for the **user**: prompts they can paste to start or steer a film
(Chinese first — that is how this skill's author works — with English next to it). The second is
for **you**: what such messages mean and what to do with them.

## For the user — 可以直接复制的提示词

**开始一个新视频 / Start a film**

```text
用 paper-intro-video 这个 skill，给我们的论文做一个介绍视频，用于参会和项目网站。
材料：论文 PDF <路径>；代码仓库 <路径或链接>；项目网站 <链接>。
要求：约 5 分钟；英文口播 + 英文字幕（另出一份无字幕的）；风格按 skill 的默认方向。
项目名读作 "<…>"。先检查本机环境，需要下载什么先问我。
```

```text
Use the paper-intro-video skill to make an intro video for our paper, for the conference and the
project site. Sources: the PDF at <path>; the repository at <path or link>; the website <link>.
About five minutes; English narration and captions (plus a caption-free copy); the skill's default
look. The project's name is pronounced "<…>". Check the machine first and ask before downloading anything.
```

**按截图反馈改一版 / A review round**

```text
（贴截图）图1 这里 <问题>；图2 <问题>；其余保持不变。改完重新渲染，告诉我改了哪些、片长有没有变。
```

**换配音 / Another voice**

```text
把口播换成 am_michael（或：给我几个声音的试听小样我来选）。画面和字幕要跟着新声音走。
```

**改几句台词 / Change a few lines**

```text
第 17 句改成："<新句子>"。只重新合成这一句，其余不动。
```

**改读音 / Fix a pronunciation**

```text
"0xClaw" 应该读作 "Ox Claw"，不是 "Zero X Claw"。全片统一改掉。
```

**加一种字幕语言 / Another caption language**

```text
再出一份中文字幕版（口播仍是英文）。
```

**用我自己的录音 / My own recording**

```text
我按 script/full/narration.md 逐句录好了，放在 voice/full/me/。用我的录音重新出片。
```

**核对事实 / Check the facts**

```text
把视频里出现的每个数字和论文对一遍，列出出处（表/图/章节）；论文里没有的说法单独标出来。
```

**沉淀下来 / Keep what was learned**

```text
把这轮的反馈记到 skill 里（references/ 对应的文件），以后的视频默认都这样做。
```

## For you — reading what they send

**The opening request** rarely says everything. Before building, make sure you know (ask in one
message only for what the sources cannot tell you; otherwise state your assumption and go on):
the sources (PDF, repo, site); who watches it and where (conference attendees, website visitors —
"not only academics"); the length and who set it; the languages of voice and captions; how names
are pronounced; whether the venue has rules for videos (length, format, logos) — if you cannot
find them, say so.

**Review rounds come as screenshots with short notes.** Read each note for the rule behind it,
not just the pixel:

| they wrote | it meant | what was done |
| --- | --- | --- |
| "别人一看就是AI不想看了" (people see it is AI and stop watching) | the look is generic, not one element | a new art direction for the whole film |
| "图二那么多字不行" (too many words on that panel) | one idea per screen | split it; show the thing instead |
| "视频的动画有点少了" (not enough animation) | stills that fade in read as slides | every line acted out; a camera; a stillness measurement |
| "这种分割不能出现" (this seam must not appear) | grounds must be clean at every camera position | camera centred, dark cards reach past the frame, checked numerically |
| "字幕框底色要移除，不同背景都要显示出来" | captions without a box, readable everywhere | words only, outlined in the ground colour |
| "slogan 没有说清楚论文" (the slogan does not say what the paper does) | a slogan must say what happens, not name parts | rewritten as two plain sentences, each with a figure |
| "最好全称然后括号" (full name, then brackets) | the audience is wider than the field | venue written out, abbreviation in brackets |
| "左上角这些没有用，不是slides" (these labels are useless, it is not slides) | no slide furniture | chapter labels removed |
| "口播一定要用" (narration is a must) | captions alone split attention | a voice; captions and pictures follow it |
| "合作者说歪了…你确认一下" (a collaborator says it is crooked — check) | measure before answering; the eye may be right when the box is not | measured tilt and centres; aligned on visual centres |
| "只需要5min的即可" (only the 5-minute one) | fewer variants | one cut; captioned and caption-free |

**When a note says "the rest is fine", believe it.** Change what was asked. If you extend a fix to
similar places, or improve something adjacent, say so explicitly in the handover.

**When they ask a question in the middle of a round** ("why is the cover black?"), answer the
question; do not start changing things unless they ask.

**What to keep.** Feedback that would apply to the next film — a rule of taste, a way of working —
belongs in the user's memory (if the session has one) and, if they ask, in this skill's
`references/`. Feedback about this film only (a wording, a colour of one bar) does not.

## The handover message

Short, in their language, in this order: what changed (the things they asked for, each with its
result); the files; what you verified, in numbers; what you could not verify and need them to
check; decisions that are theirs. See `references/qa.md`.
