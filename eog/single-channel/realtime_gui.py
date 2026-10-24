# -*- coding: utf-8 -*-
"""
realtime_gui.py - simple GUI: an eye follows the class detected by the LDA model.

The long signal is OFFLINE (long_signal.txt) but is processed as in real time:
samples are fed at the sampling rate, and every HOP_S seconds the last WIN_S seconds (3 s)
are classified.

  up       -> the iris moves up
  d        -> the iris moves down
  st       -> the iris stays in the centre
  db       -> the eye blinks twice; if the eye was looking up (or down), the UP (or DOWN)
              icon is SELECTED (green)

Run:  python realtime_gui.py                      (a file dialog asks for your signal)
      python realtime_gui.py my_signal.txt        (loads the file directly)
Needs lda_model.joblib. Your file = one raw EOG value per line, sampled at FS (250 Hz).
"""
import math
import sys
import time
import tkinter as tk
from tkinter import filedialog, messagebox
import numpy as np

from realtime_core import (FS, WIN_S, HOP_S, MODEL_FILE,
                           load_detector, classify_window, true_label)

# ------------------------------ drawing constants ---------------------------
W, H_EYE = 480, 520
TRACE_H, TRACE_S = 140, 9.0
BG = "#f5f0e8"
CX, CY = 240, 260                 # eye centre
A, B = 150, 80                    # eye half width / half height
IRIS_R, PUPIL_R, IRIS_MAX = 42, 18, 30
NAMES = {"up": "UP", "d": "DOWN", "st": "STRAIGHT", "db": "DOUBLE BLINK"}


class EyeApp:
    def __init__(self, root, path=None):
        self.root = root
        root.title("EOG real-time eye interface")
        self.bundle = load_detector(MODEL_FILE)
        self.win = int(WIN_S * FS)
        self.signal = np.zeros(self.win)          # placeholder until a file is loaded
        self.loaded = False
        self.hop_s = tk.DoubleVar(value=1.0)      # a decision every 1 s on the last 3 s

        # ---- widgets ----
        self.eye = tk.Canvas(root, width=W, height=H_EYE, bg=BG, highlightthickness=0)
        self.eye.pack()
        self.trace = tk.Canvas(root, width=W, height=TRACE_H, bg="white", highlightthickness=1,
                               highlightbackground="#bbbbbb")
        self.trace.pack(pady=(4, 0))
        self.status = tk.Label(root, text="", font=("Consolas", 11), justify="left", anchor="w")
        self.status.pack(fill="x", padx=8, pady=4)
        bar = tk.Frame(root)
        bar.pack(pady=(0, 8))
        self.btn = tk.Button(bar, text="Start", width=9, command=self.toggle)
        self.btn.pack(side="left", padx=4)
        tk.Button(bar, text="Restart", width=9, command=self.reset).pack(side="left", padx=4)
        tk.Button(bar, text="Load signal...", command=self.ask_file).pack(side="left", padx=4)
        bar2 = tk.Frame(root)
        bar2.pack(pady=(0, 8))
        tk.Label(bar2, text="speed:").pack(side="left", padx=(0, 2))
        self.speed = tk.IntVar(value=1)
        for sp in (1, 2, 5):
            tk.Radiobutton(bar2, text=f"{sp}x", variable=self.speed, value=sp).pack(side="left")
        tk.Label(bar2, text="   decision every:").pack(side="left", padx=(12, 2))
        for h in (3.0, 1.5, 1.0):
            tk.Radiobutton(bar2, text=f"{h:g} s", variable=self.hop_s, value=h).pack(side="left")

        self.reset()
        self.truth = None
        self.last_tick = time.perf_counter()
        self.tick()
        if path:
            self.load_signal(path)
        else:
            root.after(300, self.ask_file)

    # ------------------------------ loading ----------------------------------
    def ask_file(self):
        p = filedialog.askopenfilename(
            title="Select your raw EOG signal (one value per line)",
            filetypes=[("Text files", "*.txt *.csv *.dat"), ("All files", "*.*")])
        if p:
            self.load_signal(p)

    def load_signal(self, path):
        try:
            sig = np.loadtxt(path)
            if sig.ndim > 1:                       # several columns -> first column
                sig = sig[:, 0]
            sig = sig[np.isfinite(sig)]
        except Exception as e:
            messagebox.showerror("Load error", str(e))
            return
        if len(sig) < self.win:
            messagebox.showerror("Load error", f"Signal too short: need at least {WIN_S:.0f} s "
                                 f"({self.win} samples), got {len(sig)}.")
            return
        self.signal, self.loaded = sig, True
        self.root.title(f"EOG real-time eye interface - {path.replace(chr(92), '/').split('/')[-1]}")
        self.reset()

    # ------------------------------ state ------------------------------------
    def reset(self):
        self.running = False
        self.btn.config(text="Start")
        self.pos = 0.0                         # samples received so far
        self.next_end = float(self.win)        # end of the next window to classify
        self.gaze = "st"                       # last gaze direction: up / d / st
        self.selection = None                  # "up" / "d" / None
        self.iris_y, self.iris_target = 0.0, 0.0
        self.blink_t0 = None
        self.openness = 1.0
        self.pred, self.conf, self.true = "-", 0.0, "-"
        self.last_pred = "-"                   # previous decision (to blink only once per double blink)
        self.n_win = self.n_ok = 0

    def toggle(self):
        if not self.loaded:
            self.ask_file()
            return
        if self.pos >= len(self.signal):
            self.reset()
        self.running = not self.running
        self.btn.config(text="Pause" if self.running else "Start")

    # ------------------------------ detection --------------------------------
    def process_window(self, end):
        window = self.signal[end - self.win:end]
        pred, conf = classify_window(self.bundle, window, FS)
        self.pred, self.conf = pred, conf
        if self.truth is not None:
            self.true = true_label(self.truth, end, self.win)
            self.n_win += 1
            self.n_ok += int(pred == self.true)
        if pred in ("up", "d", "st"):
            self.gaze, self.selection = pred, None
            self.iris_target = {"up": -IRIS_MAX, "d": IRIS_MAX, "st": 0}[pred]
        elif pred == "db":
            self.selection = self.gaze if self.gaze in ("up", "d") else None
            # blink only when a double blink STARTS (previous decision was not "db") and no
            # blink animation is running: overlapping windows give several "db" in a row
            if self.last_pred != "db" and self.blink_t0 is None:
                self.blink_t0 = time.perf_counter()
        self.last_pred = pred

    # ------------------------------ main loop --------------------------------
    def tick(self):
        now = time.perf_counter()
        dt, self.last_tick = now - self.last_tick, now
        if self.running:
            self.pos = min(self.pos + dt * FS * self.speed.get(), len(self.signal))
            while self.next_end <= self.pos:                 # a full window is available
                self.process_window(int(self.next_end))
                self.next_end += int(self.hop_s.get() * FS)
            if self.pos >= len(self.signal):
                self.running = False
                self.btn.config(text="Restart")
        # iris easing + blink animation (2 blinks in 0.6 s)
        self.iris_y += (self.iris_target - self.iris_y) * 0.25
        if self.blink_t0 is not None:
            t = now - self.blink_t0
            if t < 0.6:
                self.openness = abs(math.cos(math.pi * (t % 0.3) / 0.3))
            else:
                self.blink_t0, self.openness = None, 1.0
        self.draw()
        self.root.after(30, self.tick)

    # ------------------------------ drawing ----------------------------------
    def icon(self, cy, up, selected):
        c = self.eye
        fill, edge = ("#2ecc71", "#1e8449") if selected else ("#ecf0f1", "#95a5a6")
        c.create_rectangle(CX - 60, cy - 38, CX + 60, cy + 38, fill=fill, outline=edge, width=4)
        s = 1 if up else -1
        c.create_polygon(CX, cy - 22 * s, CX - 24, cy + 14 * s, CX + 24, cy + 14 * s,
                         fill="white" if selected else "#7f8c8d", outline="")

    def draw(self):
        c = self.eye
        c.delete("all")
        self.icon(70, True, self.selection == "up")
        self.icon(450, False, self.selection == "d")
        # eye: white, iris, pupil
        c.create_oval(CX - A, CY - B, CX + A, CY + B, fill="white", outline="")
        iy = CY + self.iris_y
        c.create_oval(CX - IRIS_R, iy - IRIS_R, CX + IRIS_R, iy + IRIS_R, fill="#3b7dd8", outline="#1f4e96", width=2)
        c.create_oval(CX - PUPIL_R, iy - PUPIL_R, CX + PUPIL_R, iy + PUPIL_R, fill="black", outline="")
        c.create_oval(CX - 14, iy - 22, CX - 4, iy - 12, fill="white", outline="")
        # eyelids (background coloured) + outline of the visible part
        lid = (1 - self.openness) * B
        if lid > 0:
            c.create_rectangle(CX - A - 3, CY - B - 3, CX + A + 3, CY - B + lid, fill=BG, outline="")
            c.create_rectangle(CX - A - 3, CY + B - lid, CX + A + 3, CY + B + 3, fill=BG, outline="")
        lim = B * self.openness
        pts = []
        for k in range(73):
            th = 2 * math.pi * k / 72
            pts += [CX + A * math.cos(th), CY + max(-lim, min(lim, B * math.sin(th)))]
        c.create_line(*pts, fill="black", width=4, smooth=False)
        # trace of the last seconds of the raw signal
        self.draw_trace()
        # status text
        acc = f"{100 * self.n_ok / self.n_win:5.1f}%" if self.n_win else "  -  "
        sel = NAMES.get(self.selection, "-") if self.selection else "-"
        self.status.config(text=(
            f"time      : {self.pos / FS:6.1f} s / {len(self.signal) / FS:.1f} s\n"
            f"detected  : {NAMES.get(self.pred, self.pred):<13s} (confidence {self.conf:.2f})\n"
            f"true label: {NAMES.get(self.true, self.true):<13s}   window accuracy: {acc} "
            f"({self.n_ok}/{self.n_win})\n"
            f"SELECTED  : {sel}"))

    def draw_trace(self):
        c = self.trace
        c.delete("all")
        n_show = int(TRACE_S * FS)
        end = int(self.pos)
        seg = self.signal[max(0, end - n_show):end]
        if len(seg) < 2:
            return
        seg = seg - np.median(seg)
        scale = max(np.max(np.abs(seg)), 0.05)
        xs = np.linspace(W - len(seg) / n_show * W, W - 1, len(seg))
        ys = TRACE_H / 2 - seg / scale * (TRACE_H / 2 - 12)
        step = max(1, len(seg) // 600)
        pts = np.column_stack([xs[::step], ys[::step]]).ravel().tolist()
        c.create_line(0, TRACE_H / 2, W, TRACE_H / 2, fill="#dddddd")
        c.create_line(*pts, fill="#1f77b4")
        c.create_text(6, 4, anchor="nw", fill="#666666", font=("Arial", 8),
                      text=f"raw EOG - last {TRACE_S:.0f} s  (decision every {HOP_S:.0f} s on the last {WIN_S:.0f} s)")


if __name__ == "__main__":
    root = tk.Tk()
    EyeApp(root, sys.argv[1] if len(sys.argv) > 1 else None)
    root.mainloop()
