# -*- coding: utf-8 -*-
"""
realtime_core.py - the detector (no GUI).

A window of WIN_S seconds of RAW signal is
    preprocess_signal -> extract_feature_vector -> LDA -> (class, confidence)
exactly as in the training, so the same functions are used offline and in the GUI.

Run this file alone to evaluate the detector on the long signal (no GUI):
    python realtime_core.py
"""
import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import confusion_matrix

from preprocessing import preprocess_signal
from feature_extraction import extract_feature_vector

FS = 250.0
WIN_S = 3.0              # window length (s)
HOP_S = 3.0              # a new decision every HOP_S seconds
MODEL_FILE = "lda_model.joblib"
SIGNAL_FILE = "long_signal.txt"
TRUTH_FILE = "long_signal_truth.csv"


def load_detector(path=MODEL_FILE):
    return joblib.load(path)


def classify_window(bundle, window, fs=FS):
    """window = raw samples (1-D). Returns (class label, confidence)."""
    filtered = preprocess_signal(window, fs=fs)
    vec, names = extract_feature_vector(filtered, fs=fs)
    if names != bundle["feature_names"]:
        raise ValueError("Feature names differ from the training: re-run main.py and train_lda.py")
    model = bundle["model"]
    proba = model.predict_proba(vec.reshape(1, -1))[0]
    k = int(np.argmax(proba))
    return str(model.classes_[k]), float(proba[k])


def load_truth(path, n_samples, fs=FS):
    """Per-sample true label (string array) built from long_signal_truth.csv."""
    df = pd.read_csv(path)
    arr = np.full(n_samples, "", dtype=object)
    for _, r in df.iterrows():
        arr[int(round(r.start_s * fs)):int(round(r.end_s * fs))] = r.label
    return arr


def true_label(truth, end, win):
    return truth[max(0, end - win // 2)]            # label at the middle of the window


def run_offline(bundle, signal, truth=None, fs=FS, win_s=WIN_S, hop_s=HOP_S):
    """Slide a window over the whole signal exactly as the real-time loop does."""
    win, hop = int(win_s * fs), int(hop_s * fs)
    rows = []
    for end in range(win, len(signal) + 1, hop):
        pred, conf = classify_window(bundle, signal[end - win:end], fs)
        rows.append({"t_end_s": end / fs, "pred": pred, "conf": round(conf, 3),
                     "true": true_label(truth, end, win) if truth is not None else ""})
    return pd.DataFrame(rows)


if __name__ == "__main__":
    bundle = load_detector()
    sig = np.loadtxt(SIGNAL_FILE)
    truth = load_truth(TRUTH_FILE, len(sig))
    res = run_offline(bundle, sig, truth)
    print(res.to_string(index=False))
    acc = (res.pred == res.true).mean()
    print(f"\nWindow accuracy: {100 * acc:.1f}%  ({int((res.pred == res.true).sum())}/{len(res)})")
    labels = sorted(set(res.true) | set(res.pred))
    print("classes:", labels)
    print(confusion_matrix(res.true, res.pred, labels=labels))
