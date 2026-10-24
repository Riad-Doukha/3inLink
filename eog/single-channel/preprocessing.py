# -*- coding: utf-8 -*-
"""
preprocessing.py - EOG preprocessing
Input : raw signal, fs
Output: filtered signal
"""
import numpy as np
from scipy.signal import butter, sosfiltfilt


def preprocess_signal(raw, fs=250.0, mode="short", high_cut=15.0, low_cut=0.3,
                      order=4, trim=2, baseline_s=0.3, pad_s=0.4):
    """
    raw        : 1-D raw EOG signal (volts)
    fs         : sampling frequency (Hz)
    mode       : "short" -> baseline removal (first baseline_s seconds) + low-pass
                 "long"  -> median removal + band-pass (low_cut - high_cut)
    returns    : filtered signal (1-D numpy array, `trim` samples shorter at each end)
    """
    eog = np.asarray(raw, dtype=float).reshape(-1)
    eog = eog[np.isfinite(eog)]                       # remove NaN / inf

    if trim > 0 and len(eog) > 2 * trim:              # remove acquisition glitches
        eog = eog[trim:-trim]
    n = len(eog)
    if n < 10:
        raise ValueError("Signal too short to be filtered")

    if mode == "short":
        n_base = min(max(int(baseline_s * fs), 1), n)
        signal = eog - np.median(eog[:n_base])
        sos = butter(order, high_cut, btype="low", fs=fs, output="sos")
        padlen = min(n - 1, int(0.2 * fs))
    else:
        signal = eog - np.median(eog)
        sos = butter(order, [low_cut, high_cut], btype="bandpass", fs=fs, output="sos")
        padlen = min(n - 1, int(pad_s * fs))

    return sosfiltfilt(sos, signal, padtype="constant", padlen=padlen)
