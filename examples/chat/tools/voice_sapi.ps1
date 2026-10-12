# Narration with a voice that is already installed in Windows (System.Speech / SAPI 5).
# No download, works offline - but the stock voices sound synthetic. It writes one clip per
# narration line plus the moment every word starts, which is what keeps captions and pictures
# on the voice (see tools/narration.py).
#
#   powershell -ExecutionPolicy Bypass -File tools/voice_sapi.ps1                      # Zira, full cut
#   powershell -ExecutionPolicy Bypass -File tools/voice_sapi.ps1 -Voice "Microsoft David Desktop" -Name david
#   python tools/narration.py --clips voice/full/zira
#
#   -Rate   overall speaking rate, -10 .. 10 (0 = the voice's default)
param([string]$Cut = "full", [string]$Voice = "Microsoft Zira Desktop", [int]$Rate = 0, [string]$Name = "zira")
$root = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName System.Speech
Add-Type -ReferencedAssemblies System.Speech -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Speech.Synthesis;
public class OxWordLog {
  public List<string> Rows = new List<string>();
  /* seconds between the first and the last audible sample of a 16-bit mono WAV */
  public static double Speech(string path) {
    byte[] b = System.IO.File.ReadAllBytes(path);
    int sr = BitConverter.ToInt32(b, 24), first = -1, last = -1;
    for (int i = 44; i + 1 < b.Length; i += 2) { short v = BitConverter.ToInt16(b, i); if (v > 400 || v < -400) { if (first < 0) first = i; last = i; } }
    return first < 0 ? 0.0 : (last - first) / (2.0 * sr);
  }
  public void Hook(SpeechSynthesizer s) {
    s.SpeakProgress += delegate(object o, SpeakProgressEventArgs e) {
      lock (Rows) { Rows.Add(e.AudioPosition.TotalSeconds.ToString("F4", CultureInfo.InvariantCulture) + "," + e.CharacterPosition + "," + e.CharacterCount); }
    };
  }
}
"@
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice($Voice)
$log = New-Object OxWordLog
$log.Hook($s)
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$cues = (Get-Content (Join-Path $root "build\$Cut\timing.json") -Raw -Encoding UTF8 | ConvertFrom-Json).cues
$out = Join-Path $root "voice\$Cut\$Name"
New-Item -ItemType Directory -Force $out | Out-Null
Get-ChildItem $out -Include *.wav, *.json -Recurse | Remove-Item -Confirm:$false

function Say([string]$text, [string]$wav, [int]$rate) {
  $log.Rows.Clear()
  $s.Rate = $rate
  $s.SetOutputToWaveFile($wav, $fmt)
  $s.Speak($text)
  $s.SetOutputToNull()
  Start-Sleep -Milliseconds 60                               # let the last word events arrive
  return [OxWordLog]::Speech($wav)
}

$i = 1
foreach ($c in $cues) {
  $id = "{0:d2}" -f $i
  $len = Say $c.say (Join-Path $out "$id.wav") $Rate
  $rows = ($log.Rows | ForEach-Object { "[" + $_ + "]" }) -join ","
  $say = ($c.say | ConvertTo-Json)
  [System.IO.File]::WriteAllText((Join-Path $out "$id.json"), "{`"say`": $say, `"rate`": $Rate, `"events`": [$rows]}", $utf8)
  $i++
}
$s.Dispose()
[System.IO.File]::WriteAllText((Join-Path $out "voice.json"), "{`"engine`": `"sapi`", `"voice`": `"$Voice`", `"rate`": $Rate, `"licence`": `"ships with Windows`"}", $utf8)
"synthesised $($i - 1) lines with $Voice (rate $Rate) -> $out"
