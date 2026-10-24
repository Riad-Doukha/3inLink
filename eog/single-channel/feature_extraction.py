# -*- coding: utf-8 -*-
"""
feature_extraction.py  (self-contained, replaces eog_features.py)
Input : filtered signal, fs
Output: feature vector (+ feature names)

Groups:
  1. time domain  : statistics, shape factors, Hjorth, trend, crossings, derivatives
  2. frequency    : FFT, Welch PSD, band powers (absolute + relative), spectral shape
  3. peaks        : ONLY significant peaks / valleys (blink-like, clear amplitude).
                    Small fluctuations (like the 'straight' signal) are NOT peaks.
                    Includes the duration between successive peaks.
  4. double blink : two blinks <= 1 s apart
"""
import numpy as np
from scipy.signal import welch, find_peaks
from scipy.integrate import trapezoid
from scipy.stats import skew, kurtosis, iqr

# ============================== SETTINGS =====================================
FS = 250.0
FREQUENCY_BANDS = {"0_4Hz": (0.3, 4.0), "4_8Hz": (4.0, 8.0), "8_13Hz": (8.0, 13.0),
                   "13_20Hz": (13.0, 20.0), "20_35Hz": (20.0, 35.0)}
THRESHOLD_FACTOR = 0.5            # threshold crossing: 0.5 x std
WILLISON_THRESHOLD_V = 0.005      # Willison amplitude: |x[i+1]-x[i]| > 5 mV

# ---- significant peaks (volts of the FILTERED signal) ----
PEAK_MIN_HEIGHT_V = 0.04          # a peak must rise at least 40 mV above the median level
                                  # (straight: max ~0.01 V -> no peaks ; blink: ~0.12 V -> peak)
PEAK_SIGMA_FACTOR = 4.0           # ... and at least 4 x the noise level (from the derivative, robust)
PEAK_PROMINENCE_RATIO = 0.6       # prominence >= 0.6 x threshold (the peak must stand out)
PEAK_MIN_DISTANCE_S = 0.15        # closer peaks = ONE peak
PEAK_WIDTH_S = (0.02, 0.5)        # width at half prominence; wider = slow eye movement, not a blink
BLINK_POLARITY = "positive"       # "positive": blinks go up, "negative": blinks go down
DOUBLE_BLINK_MAX_INTERVAL_S = 1.0 # 2 successive blinks <= 1 s apart = DOUBLE BLINK


# ============================== PEAK DETECTION ===============================
def _noise_sigma(x):
    """Robust noise level from the first difference (insensitive to blinks and drift)."""
    d = np.diff(x)
    if len(d) == 0:
        return 0.0
    return 1.4826 * np.median(np.abs(d - np.median(d))) / np.sqrt(2)


def detect_significant_peaks(x, fs=FS, polarity="positive"):
    """Returns (indices, amplitudes, widths_s). Amplitudes are positive heights above the
    median level (for polarity='negative' the signal is flipped, so valleys are detected)."""
    s = np.asarray(x, float)
    s = s - np.median(s)
    if polarity == "negative":
        s = -s
    thr = max(PEAK_MIN_HEIGHT_V, PEAK_SIGMA_FACTOR * _noise_sigma(s))
    idx, props = find_peaks(s, height=thr, prominence=PEAK_PROMINENCE_RATIO * thr,
                            distance=max(1, int(PEAK_MIN_DISTANCE_S * fs)),
                            width=(PEAK_WIDTH_S[0] * fs, PEAK_WIDTH_S[1] * fs))
    return idx, s[idx], props["widths"] / fs


# ============================== 1. TIME DOMAIN ===============================
def extract_time_features(x, prefix="H_", fs=FS):
    f = {}
    x = np.asarray(x, float)
    n = len(x)
    t = np.arange(n) / fs
    mean_v, std_v = np.mean(x), np.std(x)
    rms = np.sqrt(np.mean(x ** 2))
    mav = np.mean(np.abs(x))

    # --- statistics / amplitude ---
    f[prefix + "mean"] = mean_v
    f[prefix + "median"] = np.median(x)
    f[prefix + "std"] = std_v
    f[prefix + "variance"] = np.var(x)
    f[prefix + "minimum"] = np.min(x)
    f[prefix + "maximum"] = np.max(x)
    f[prefix + "range"] = np.ptp(x)
    f[prefix + "mean_absolute_value"] = mav
    f[prefix + "mean_absolute_deviation"] = np.mean(np.abs(x - mean_v))
    f[prefix + "rms"] = rms
    f[prefix + "signal_energy"] = np.sum(x ** 2)
    f[prefix + "auc_absolute"] = trapezoid(np.abs(x), x=t)
    f[prefix + "auc_signed"] = trapezoid(x, x=t)
    f[prefix + "iqr"] = iqr(x)
    f[prefix + "percentile_5"] = np.percentile(x, 5)
    f[prefix + "percentile_95"] = np.percentile(x, 95)
    if std_v > 1e-12:
        f[prefix + "skewness"] = skew(x, bias=False)
        f[prefix + "kurtosis"] = kurtosis(x, fisher=True, bias=False)
    else:
        f[prefix + "skewness"] = 0.0
        f[prefix + "kurtosis"] = 0.0
    c = x - mean_v
    f[prefix + "third_central_moment"] = np.mean(c ** 3)
    f[prefix + "fourth_central_moment"] = np.mean(c ** 4)

    # --- shape factors ---
    peak_abs = np.max(np.abs(x))
    f[prefix + "crest_factor"] = peak_abs / rms if rms > 1e-12 else 0.0
    f[prefix + "shape_factor"] = rms / mav if mav > 1e-12 else 0.0
    f[prefix + "impulse_factor"] = peak_abs / mav if mav > 1e-12 else 0.0
    sra = np.mean(np.sqrt(np.abs(x))) ** 2
    f[prefix + "clearance_factor"] = peak_abs / sra if sra > 1e-12 else 0.0

    # --- global peak / valley amplitude and position ---
    pi, vi = int(np.argmax(x)), int(np.argmin(x))
    f[prefix + "PAV"] = x[pi]
    f[prefix + "PAP_seconds"] = t[pi]
    f[prefix + "VAV"] = x[vi]
    f[prefix + "VAP_seconds"] = t[vi]

    # --- trend (up / down movements) ---
    k = max(1, int(0.3 * fs))
    f[prefix + "mean_first_0.3s"] = np.mean(x[:k])
    f[prefix + "mean_last_0.3s"] = np.mean(x[-k:])
    f[prefix + "net_change"] = np.mean(x[-k:]) - np.mean(x[:k])
    f[prefix + "linear_slope"] = np.polyfit(t, x, 1)[0] if n > 1 else 0.0

    # --- derivative / slope ---
    dx = np.diff(x) * fs
    if len(dx) == 0:
        dx = np.array([0.0])
    f[prefix + "waveform_length"] = np.sum(np.abs(np.diff(x)))
    f[prefix + "derivative_mean"] = np.mean(dx)
    f[prefix + "derivative_std"] = np.std(dx)
    f[prefix + "derivative_rms"] = np.sqrt(np.mean(dx ** 2))
    f[prefix + "derivative_mean_absolute"] = np.mean(np.abs(dx))
    f[prefix + "maximum_positive_slope"] = np.max(dx)
    f[prefix + "maximum_negative_slope"] = np.min(dx)
    f[prefix + "maximum_absolute_slope"] = np.max(np.abs(dx))
    s = np.sign(dx)
    s = s[s != 0]
    f[prefix + "slope_sign_changes"] = int(np.sum(s[1:] != s[:-1])) if len(s) >= 2 else 0
    f[prefix + "willison_amplitude"] = int(np.sum(np.abs(np.diff(x)) > WILLISON_THRESHOLD_V))

    # --- Hjorth parameters ---
    d1 = np.diff(x)
    d2 = np.diff(d1)
    act = np.var(x)
    mob = np.sqrt(np.var(d1) / act) if act > 1e-18 and len(d1) else 0.0
    mob2 = np.sqrt(np.var(d2) / np.var(d1)) if len(d2) and np.var(d1) > 1e-18 else 0.0
    f[prefix + "hjorth_activity"] = act
    f[prefix + "hjorth_mobility"] = mob
    f[prefix + "hjorth_complexity"] = mob2 / mob if mob > 1e-12 else 0.0

    # --- crossings ---
    signs = np.sign(c)
    for i in range(1, len(signs)):
        if signs[i] == 0:
            signs[i] = signs[i - 1]
    f[prefix + "zero_crossing_count"] = int(np.sum(signs[1:] * signs[:-1] < 0))
    thr = THRESHOLD_FACTOR * np.std(c)
    f[prefix + "threshold_value"] = thr
    if thr > 1e-12:
        above = np.abs(c) >= thr
        f[prefix + "TCV"] = int(np.sum(above[1:] & ~above[:-1]))
    else:
        f[prefix + "TCV"] = 0
    return f


# ============================== 2. FREQUENCY DOMAIN ==========================
def extract_frequency_features(x, prefix="H_", fs=FS):
    f = {}
    x = np.asarray(x, float)
    n = len(x)
    xc = x - np.mean(x)

    # FFT
    mag = np.abs(np.fft.rfft(xc * np.hanning(n)))
    fr = np.fft.rfftfreq(n, d=1.0 / fs)
    dom = (np.argmax(mag[1:]) + 1) if len(mag) > 1 else 0
    f[prefix + "dominant_frequency_hz"] = fr[dom]
    f[prefix + "fft_energy"] = np.sum(mag ** 2) / n

    # Welch PSD
    nperseg = min(n, int(2 * fs))
    freqs, psd = welch(xc, fs=fs, window="hann", nperseg=nperseg, noverlap=nperseg // 2,
                       detrend="constant", scaling="density")
    f[prefix + "mean_psd"] = np.mean(psd)
    f[prefix + "peak_psd"] = np.max(psd)
    f[prefix + "peak_psd_frequency_hz"] = freqs[int(np.argmax(psd))]
    valid = (freqs >= 0.3) & (freqs <= 35.0)
    total = trapezoid(psd[valid], x=freqs[valid]) if np.sum(valid) >= 2 else 0.0
    f[prefix + "total_band_power"] = total

    # band powers (absolute and relative)
    for name, (lo, hi) in FREQUENCY_BANDS.items():
        m = (freqs >= lo) & (freqs < hi)
        if m.sum() >= 2:
            p = trapezoid(psd[m], x=freqs[m])
        elif m.sum() == 1:
            p = psd[m][0] * (fs / nperseg)
        else:
            p = 0.0
        f[prefix + "band_power_" + name] = p
        f[prefix + "relative_power_" + name] = p / total if total > 1e-18 else 0.0

    # spectral shape (0.3-35 Hz)
    fv, pv = freqs[valid], psd[valid]
    ps = np.sum(pv)
    if len(fv) >= 2 and ps > 1e-18:
        centroid = np.sum(fv * pv) / ps
        f[prefix + "spectral_centroid_hz"] = centroid
        f[prefix + "spectral_spread_hz"] = np.sqrt(np.sum(((fv - centroid) ** 2) * pv) / ps)
        pn = pv / ps
        f[prefix + "spectral_entropy"] = -np.sum(pn * np.log2(pn + 1e-18)) / np.log2(len(pn))
        cum = np.cumsum(pv) / ps
        f[prefix + "median_frequency_hz"] = fv[np.searchsorted(cum, 0.5)]
        f[prefix + "spectral_edge_95_hz"] = fv[min(np.searchsorted(cum, 0.95), len(fv) - 1)]
    else:
        for k in ("spectral_centroid_hz", "spectral_spread_hz", "spectral_entropy",
                  "median_frequency_hz", "spectral_edge_95_hz"):
            f[prefix + k] = 0.0
    return f


# ============================== 3. SIGNIFICANT PEAKS =========================
def _interval_stats(times, tag, prefix):
    d = np.diff(times) if len(times) > 1 else np.array([])
    f = {}
    f[prefix + tag + "_interval_1_s"] = float(d[0]) if len(d) > 0 else 0.0    # 1st -> 2nd
    f[prefix + tag + "_interval_2_s"] = float(d[1]) if len(d) > 1 else 0.0    # 2nd -> 3rd
    f[prefix + tag + "_interval_mean_s"] = float(d.mean()) if len(d) else 0.0
    f[prefix + tag + "_interval_min_s"] = float(d.min()) if len(d) else 0.0
    f[prefix + tag + "_interval_max_s"] = float(d.max()) if len(d) else 0.0
    f[prefix + tag + "_interval_std_s"] = float(d.std()) if len(d) else 0.0
    f[prefix + tag + "_first_to_last_s"] = float(times[-1] - times[0]) if len(times) > 1 else 0.0
    return f


def extract_peak_features(x, prefix="H_", fs=FS):
    """Only significant peaks (upward) and valleys (downward); fluctuations are ignored."""
    f = {}
    for tag, pol in (("peak", "positive"), ("valley", "negative")):
        idx, amp, wid = detect_significant_peaks(x, fs, pol)
        times = idx / fs
        f[prefix + tag + "_count"] = int(len(idx))
        f[prefix + tag + "_mean_amplitude"] = float(amp.mean()) if len(amp) else 0.0
        f[prefix + tag + "_max_amplitude"] = float(amp.max()) if len(amp) else 0.0
        f[prefix + tag + "_mean_width_s"] = float(wid.mean()) if len(wid) else 0.0
        f[prefix + tag + "_first_time_s"] = float(times[0]) if len(times) else 0.0
        f.update(_interval_stats(times, tag, prefix))
    return f


# ============================== 4. DOUBLE BLINK ==============================
def extract_blink_features(x, prefix="H_", fs=FS):
    idx, amp, _ = detect_significant_peaks(x, fs, BLINK_POLARITY)
    d = np.diff(idx / fs) if len(idx) > 1 else np.array([])
    pair = d <= DOUBLE_BLINK_MAX_INTERVAL_S
    f = {}
    f[prefix + "blink_count"] = int(len(idx))
    f[prefix + "double_blink_count"] = int(np.sum(pair))
    f[prefix + "is_double_blink"] = int(np.any(pair))
    f[prefix + "double_blink_interval_s"] = float(d[pair][0]) if np.any(pair) else 0.0
    return f


# ============================== ALL FEATURES =================================
FEATURE_GROUPS = {
    "time": extract_time_features,
    "frequency": extract_frequency_features,
    "peaks": extract_peak_features,
    "blink": extract_blink_features,
}


def extract_all_features(x, prefix="H_", fs=FS, groups=None):
    feats = {}
    for name in (groups or FEATURE_GROUPS):
        feats.update(FEATURE_GROUPS[name](x, prefix, fs))
    return feats


def extract_feature_vector(x, fs=FS, prefix="H_"):
    """Returns (vector, names) for one filtered signal."""
    feats = extract_all_features(x, prefix=prefix, fs=fs)
    names = list(feats.keys())
    vec = np.nan_to_num(np.array([feats[k] for k in names], dtype=float),
                        nan=0.0, posinf=0.0, neginf=0.0)
    return vec, names
