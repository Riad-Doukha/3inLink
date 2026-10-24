# -*- coding: utf-8 -*-
"""
train_lda.py - train the final LDA model and save it (lda_model.joblib).

Uses features_dataset.csv, which is created by main.py (same preprocessing + features).

TEST_SUBJECT:
  - an int (e.g. 21): that subject is NOT used for training, so the long-signal demo
    built from his recordings is a fair (subject-independent) test.
  - None            : train on ALL data (final model; the demo is then optimistic
    if the long signal is built from the same subjects).
"""
import numpy as np
import pandas as pd
import joblib
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.metrics import accuracy_score, confusion_matrix

FEATURES_CSV = "features_dataset.csv"
MODEL_FILE = "lda_model.joblib"
TEST_SUBJECT = None          # None = train on all the data (use an int to hold one subject out)

df = pd.read_csv(FEATURES_CSV)
subject = df["file"].str.extract(r"^s(\d+)_")[0].astype(int)
feat_cols = [c for c in df.columns if c not in ("file", "label")]

if TEST_SUBJECT is None:
    train, test = df, None
else:
    train, test = df[subject != TEST_SUBJECT], df[subject == TEST_SUBJECT]

model = make_pipeline(StandardScaler(), LinearDiscriminantAnalysis())
model.fit(train[feat_cols].values, train["label"].values)
print(f"Trained on {len(train)} recordings, {len(feat_cols)} features, classes: {list(model.classes_)}")

if test is not None and len(test):
    pred = model.predict(test[feat_cols].values)
    print(f"Held-out subject s{TEST_SUBJECT}: accuracy = {100 * accuracy_score(test['label'], pred):.1f}% "
          f"({len(test)} recordings)")
    print("classes:", list(model.classes_))
    print(confusion_matrix(test["label"], pred, labels=model.classes_))

joblib.dump({"model": model, "feature_names": feat_cols}, MODEL_FILE)
print("Saved:", MODEL_FILE)
