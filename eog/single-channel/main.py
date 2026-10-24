# -*- coding: utf-8 -*-
"""
main.py - load EOG data (s1..s21), preprocess, extract features,
          compare classifiers with 5-fold stratified CV (accuracy + running time).

Classes (4): up, d (down), st (straight), db (double blink)
Trials     : the number in the file name (1, 2 or 1, 2, 3) is the trial of each
             subject, NOT a class.

Requires: numpy pandas scipy scikit-learn xgboost
Files in the same folder: preprocessing.py, feature_extraction.py
"""
import os
import time
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import make_pipeline
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, confusion_matrix)
from sklearn.ensemble import RandomForestClassifier, BaggingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from xgboost import XGBClassifier

from preprocessing import preprocess_signal
from feature_extraction import extract_feature_vector

# ============================== SETTINGS =====================================
DATA_DIR = r"C:\Users\Dell\Desktop\3inlink\real-data-preparation\all data"
FS = 250.0
SUBJECTS = range(1, 22)                                   # s1 ... s21
# class -> trial numbers of each subject
TRIALS = {"up": [1, 2], "d": [1, 2], "st": [1, 2], "db": [1, 2, 3]}
MISSING = {"s12_1_db", "s10_2_db", "s18_1_st", "s20_1_st",
           "s2_2_st", "s19_2_st", "s20_2_st"}
N_SPLITS = 5
SEED = 42
FEATURES_CSV = "features_dataset.csv"
RESULTS_CSV = "classification_results.csv"


# ============================== 1. LOAD + PROCESS ============================
def build_dataset():
    X, y, names_list, feat_names = [], [], [], None
    skipped = []
    for s in SUBJECTS:
        for label, trials in TRIALS.items():
            for trial in trials:
                name = f"s{s}_{trial}_{label}"
                if name in MISSING:
                    continue
                path = os.path.join(DATA_DIR, name + ".txt")
                if not os.path.isfile(path):
                    skipped.append(name)
                    continue
                raw = np.loadtxt(path)
                filtered = preprocess_signal(raw, fs=FS)                   # preprocessing
                vec, feat_names = extract_feature_vector(filtered, fs=FS)  # features
                X.append(vec)
                y.append(label)                                            # class only
                names_list.append(name)
    if skipped:
        print(f"WARNING - not found on disk ({len(skipped)}): {skipped}")
    return np.array(X), np.array(y), names_list, feat_names


# ============================== 2. CLASSIFIERS ===============================
def get_classifiers():
    return {
        "Random Forest": RandomForestClassifier(n_estimators=200, random_state=SEED),
        "KNN": make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5)),
        "SVM": make_pipeline(StandardScaler(), SVC(kernel="rbf", C=1.0, gamma="scale")),
        "Decision Tree": DecisionTreeClassifier(random_state=SEED),
        "LDA": make_pipeline(StandardScaler(), LinearDiscriminantAnalysis()),
        "XGBoost": XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.1,
                                 eval_metric="mlogloss", random_state=SEED,
                                 n_jobs=-1),
        "Bagging": BaggingClassifier(estimator=DecisionTreeClassifier(),
                                     n_estimators=100, random_state=SEED),
    }


# ============================== 3. EVALUATION ================================
def evaluate(X, y_enc, class_names):
    skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=SEED)
    rows, cms = [], {}
    for name, clf in get_classifiers().items():
        accs, precs, recs, f1s, fit_t, pred_t = [], [], [], [], [], []
        cm = np.zeros((len(class_names), len(class_names)), dtype=int)
        t_total = time.perf_counter()
        for tr, te in skf.split(X, y_enc):
            model = clone(clf)
            t0 = time.perf_counter()
            model.fit(X[tr], y_enc[tr])
            fit_t.append(time.perf_counter() - t0)
            t0 = time.perf_counter()
            pred = model.predict(X[te])
            pred_t.append(time.perf_counter() - t0)
            accs.append(accuracy_score(y_enc[te], pred))
            precs.append(precision_score(y_enc[te], pred, average="macro", zero_division=0))
            recs.append(recall_score(y_enc[te], pred, average="macro", zero_division=0))
            f1s.append(f1_score(y_enc[te], pred, average="macro", zero_division=0))
            cm += confusion_matrix(y_enc[te], pred, labels=range(len(class_names)))
        total = time.perf_counter() - t_total
        rows.append({
            "Classifier": name,
            "Accuracy (%)": 100 * np.mean(accs), "Acc std": 100 * np.std(accs),
            "Precision (%)": 100 * np.mean(precs),
            "Recall (%)": 100 * np.mean(recs),
            "F1 (%)": 100 * np.mean(f1s),
            "Train time/fold (s)": np.mean(fit_t),
            "Predict time/fold (s)": np.mean(pred_t),
            "Total CV time (s)": total,
        })
        cms[name] = cm
        print(f"{name:14s} acc={100*np.mean(accs):6.2f}% (+/-{100*np.std(accs):.2f})  "
              f"time={total:.3f}s")
    return pd.DataFrame(rows), cms


# ============================== MAIN =========================================
if __name__ == "__main__":
    X, y, sample_names, feat_names = build_dataset()
    print(f"\nSamples: {X.shape[0]} | Features: {X.shape[1]}")
    print(pd.Series(y).value_counts().to_string(), "\n")

    # save the feature table
    df = pd.DataFrame(X, columns=feat_names)
    df.insert(0, "label", y)
    df.insert(0, "file", sample_names)
    df.to_csv(FEATURES_CSV, index=False)

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    results, cms = evaluate(X, y_enc, list(le.classes_))
    results = results.sort_values("Accuracy (%)", ascending=False).reset_index(drop=True)

    pd.set_option("display.width", 200)
    print("\n================ RESULTS (5-fold stratified CV) ================")
    print(results.round(3).to_string(index=False))
    results.to_csv(RESULTS_CSV, index=False)

    print("\nConfusion matrices (rows = true, cols = predicted), classes:", list(le.classes_))
    for name, cm in cms.items():
        print(f"\n{name}\n{cm}")
