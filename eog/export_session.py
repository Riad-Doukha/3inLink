# -*- coding: utf-8 -*-
"""
export_session.py - run the 3inLink detector over a recording and export a replay session for the web demo.

The decisions come from the team's own detector (single-channel/realtime_core.py: 3 s window ->
preprocessing -> 97 features -> LDA), unchanged. The browser replays the signal and the decisions in sync,
so judges see real classifier output without installing Python.

Usage (from the eog/ folder):
    python export_session.py single-channel/S024_r001.txt --id s024_r001 --title "Recording S024"

Output: ../apps/web/public/sessions/<id>.json and an updated ../apps/web/public/sessions/index.json
Format: docs/session-format.md
"""
import argparse
import json
import os
import sys
import warnings
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfiltfilt

HERE = Path(__file__).resolve().parent
CORE_DIR = HERE / "single-channel"
sys.path.insert(0, str(CORE_DIR))
from realtime_core import FS, WIN_S, HOP_S, load_detector, run_offline, load_truth  # noqa: E402

OUT_DIR = HERE.parent / "apps" / "web" / "public" / "sessions"
PLOT_FS = 50                      # samples per second kept for the plot
LABELS = {"up": "up", "d": "down", "st": "straight", "db": "double_blink"}


def display_signal(raw, fs=FS, plot_fs=PLOT_FS):
    """Signal for the plot only: centred on its median, 15 Hz zero-phase low-pass, in mV, downsampled.
    No high-pass, so the up/down steps keep their shape. The classifier never sees this."""
    x = np.asarray(raw, dtype=float)
    x = x[np.isfinite(x)]
    x = x - np.median(x)
    sos = butter(4, 15.0, btype="low", fs=fs, output="sos")
    x = sosfiltfilt(sos, x)
    step = int(round(fs / plot_fs))
    return np.round(x[::step] * 1000.0, 3)          # volts -> millivolts


def export(signal_path, session_id, title, truth_path=None, note=None):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")              # scikit-learn version notice when unpickling
        bundle = load_detector(str(CORE_DIR / "lda_model.joblib"))
    raw = np.loadtxt(signal_path)
    truth = load_truth(truth_path, len(raw)) if truth_path else None
    res = run_offline(bundle, raw, truth)

    decisions = [{
        "t": float(r.t_end_s),
        "window": [round(float(r.t_end_s) - WIN_S, 3), float(r.t_end_s)],
        "label": LABELS.get(r.pred, r.pred),
        "confidence": float(r.conf),
        "true": LABELS.get(r.true, r.true) if r.true else None,
    } for r in res.itertuples()]

    session = {
        "meta": {
            "id": session_id,
            "title": title,
            "phase": 1,
            "source": "real",
            "note": note,
            "fs": FS,
            "duration_s": round(len(raw) / FS, 3),
            "channels": ["h"],
            "classifier": "LDA (97 features)",
            "window_s": WIN_S,
            "hop_s": HOP_S,
        },
        "signal": {"fs": PLOT_FS, "units": "mV", "h": display_signal(raw).tolist()},
        "decisions": decisions,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{session_id}.json"
    out.write_text(json.dumps(session, separators=(",", ":")), encoding="utf-8")

    index_path = OUT_DIR / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else []
    index = [s for s in index if s["id"] != session_id]
    index.append({"id": session_id, "title": title, "phase": 1, "source": "real",
                  "duration_s": session["meta"]["duration_s"], "file": f"{session_id}.json"})
    index_path.write_text(json.dumps(index, indent=2), encoding="utf-8")

    counts = {k: sum(d["label"] == k for d in decisions) for k in LABELS.values()}
    print(f"{out.relative_to(HERE.parent)}: {len(decisions)} decisions over {session['meta']['duration_s']} s {counts}")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("signal", help="raw recording: one value (V) per line, 250 Hz")
    ap.add_argument("--id", required=True, help="session id, used as the file name")
    ap.add_argument("--title", required=True)
    ap.add_argument("--truth", help="optional ground truth CSV (start_s, end_s, label), as made by make_long_signal.py")
    ap.add_argument("--note", help="short provenance note shown in the demo")
    a = ap.parse_args()
    export(a.signal, a.id, a.title, a.truth, a.note)
