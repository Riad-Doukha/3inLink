# Replay session format

The live demo (`#/demo`) replays real classifier output. `eog/export_session.py` runs the team's detector, `eog/single-channel/realtime_core.py`, unchanged over a recording. It writes one JSON file per recording to `apps/web/public/sessions/`, plus an `index.json` listing them.

```json
{
  "meta": {
    "id": "s024_r001",
    "title": "Recording S024 · single channel",
    "phase": 1,
    "source": "real",
    "note": "Real recording from the 3inLink circuit. Subject S024 was not used to train the model.",
    "fs": 250,
    "duration_s": 55.032,
    "channels": ["h"],
    "classifier": "LDA (97 features)",
    "window_s": 3,
    "hop_s": 3
  },
  "signal": { "fs": 50, "units": "mV", "h": [0.12, 0.15, ...] },
  "decisions": [
    { "t": 6.0, "window": [3.0, 6.0], "label": "down", "confidence": 1.0, "true": null }
  ]
}
```

- `signal`: for the plot only. It is centred on its median, low-passed at 15 Hz with a zero-phase filter, in millivolts, and downsampled to 50 Hz. The classifier works on the raw 250 Hz signal.
- `decisions`: one per window. `t` is when the decision is made, which is the end of its window. `true` holds the ground truth when the recording has one.
- `label`: `up`, `down`, `left`, `right`, `straight`, `blink` or `double_blink`.

## What each label does on the patient screen

| Label | Effect |
|---|---|
| `up` / `down` (and `left` / `right` in Phase 2) | Move the focus, as a glance does |
| `double_blink` | Send the focused message |
| `blink` | Counts toward a double blink: two within 1 s send |
| `straight` | Nothing |

The mapping is `decisionToInput()` in `packages/core/src/replay.ts`.

## Add a recording

```
cd eog
python export_session.py path/to/recording.txt --id my_id --title "My recording" [--truth truth.csv] [--note "…"]
```
