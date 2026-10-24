# -*- coding: utf-8 -*-
"""
make_long_signal.py - build a LONG raw EOG signal (offline) by chaining real raw recordings
of ONE subject in the order given by SCENARIO.

Classes: st = straight, up, d = down, db = double blink (selection)
"up with selection"   = ..., "up", "db", ...   (look up, then double blink)
"down with selection" = ..., "d",  "db", ...

Output: long_signal.txt (one value per line) and long_signal_truth.csv (true label of each 3 s segment)
Every segment is cut / padded to exactly SEG_S seconds, so the 3 s windows of the detector are
aligned with the segments.
"""
import os
import numpy as np
import pandas as pd

DATA_DIR = r"C:\Users\Dell\Desktop\3inlink\real-data-preparation\all data"
FS = 250.0
SEG_S = 3.0
SUBJECT = 21                       # use the subject that was NOT used for training (train_lda.py)
SEED = 1
SCENARIO = ["st", "up", "db", "st", "d", "db", "st", "up", "st", "d", "st",
            "up", "db", "st", "d", "db", "st"]
OUT_SIGNAL = "long_signal.txt"
OUT_TRUTH = "long_signal_truth.csv"


def _fit_length(seg, n):
    return seg[:n] if len(seg) >= n else np.pad(seg, (0, n - len(seg)), mode="edge")


def build_long_signal(data_dir, subject, scenario, fs=FS, seg_s=SEG_S, seed=SEED, continuous=True):
    rng = np.random.default_rng(seed)
    n = int(seg_s * fs)
    k = int(0.3 * fs)
    signal, segments = np.array([]), []
    for i, label in enumerate(scenario):
        files = [f"s{subject}_{t}_{label}" for t in (1, 2, 3)
                 if os.path.isfile(os.path.join(data_dir, f"s{subject}_{t}_{label}.txt"))]
        if not files:
            raise FileNotFoundError(f"No recording of class '{label}' for subject s{subject}")
        name = files[rng.integers(len(files))]
        seg = np.loadtxt(os.path.join(data_dir, name + ".txt"))
        seg = _fit_length(seg[np.isfinite(seg)], n)
        if continuous and len(signal):               # remove the DC jump between recordings
            seg = seg + (np.median(signal[-k:]) - np.median(seg[:k]))
        signal = np.concatenate([signal, seg])
        segments.append({"start_s": i * seg_s, "end_s": (i + 1) * seg_s,
                         "label": label, "file": name})
    return signal, pd.DataFrame(segments)


if __name__ == "__main__":
    sig, truth = build_long_signal(DATA_DIR, SUBJECT, SCENARIO)
    np.savetxt(OUT_SIGNAL, sig)
    truth.to_csv(OUT_TRUTH, index=False)
    print(f"Long signal: {len(sig)} samples = {len(sig) / FS:.1f} s, {len(truth)} segments")
    print(truth.to_string(index=False))
