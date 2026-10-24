# EOG signal processing and classification

Python pipeline by Dr. Ahlem Benazzouz (hardware, acquisition and classification). It turns raw EOG into the commands that drive the patient screen.

## `single-channel/`: step 1, one horizontal channel

Classes: `up`, `d` (down), `st` (straight), `db` (double blink). Sampling rate 250 Hz. Recordings come from 21 subjects (s1–s21).

| File | Role |
|---|---|
| `preprocessing.py` | Cleaning, 2-sample edge trim, baseline removal (median of the first 0.3 s), zero-phase 4th-order Butterworth low-pass |
| `feature_extraction.py` | 97 time- and frequency-domain features per window, including peak/valley and double-blink features |
| `main.py` | Builds `features_dataset.csv` from the recordings and compares 7 classifiers (5-fold stratified CV) |
| `train_lda.py` | Trains the final LDA model and saves `lda_model.joblib` |
| `make_long_signal.py` | Chains real recordings of one subject into a long test signal with ground truth |
| `realtime_core.py` | The detector: 3 s window → preprocessing → features → LDA → (class, confidence), one decision every 3 s |
| `realtime_gui.py` | Tkinter interface that replays a signal as if live and shows the decisions |
| `lda_model.joblib` | Trained model (the model plus its feature names) |
| `features_dataset.csv` | Feature table of the 182 recordings |
| `S024_r001.txt` | Example continuous recording: one raw value (V) per line, 250 Hz |

Results (from the project report): LDA 99.44 % ± 1.11 accuracy with 5-fold stratified CV on 182 recordings.

## Run

```
cd eog/single-channel
python -m venv .venv && .venv\Scripts\activate      # macOS/Linux: source .venv/bin/activate
pip install -r ../requirements.txt
python realtime_gui.py S024_r001.txt                # replay a recording through the detector
```

## Export a recording to the web demo

`export_session.py` runs the detector above, unchanged, over a recording. It writes a replay file the browser plays in the live demo (`#/demo`), so judges see real classifier output without installing Python.

```
cd eog
python export_session.py single-channel/S024_r001.txt --id s024_r001 --title "Recording S024 · single channel"
```

The format is described in [`docs/session-format.md`](../docs/session-format.md).

`main.py` and `make_long_signal.py` read the raw recordings from `DATA_DIR`. Set it to the folder holding `s<subject>_<trial>_<class>.txt` files. That dataset is not included in this repository.
