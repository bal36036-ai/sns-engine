import sys, wave
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("medium", device="cpu", compute_type="int8")
for f in sys.argv[1:]:
    w = wave.open(f)
    a = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768
    segs, info = m.transcribe(a, language="ja", beam_size=5, vad_filter=False, condition_on_previous_text=False)
    print("==", f.replace("\\", "/").split("/")[-1])
    for s in segs:
        print(f"  {s.start:5.2f}〜{s.end:5.2f}秒: {s.text}")
