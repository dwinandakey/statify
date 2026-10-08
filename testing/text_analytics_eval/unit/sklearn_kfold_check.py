#!/usr/bin/env python3
"""Pembanding ukuran fold: StratifiedKFold scikit-learn (shuffle=True, random_state=42) untuk 3 kelas x 11 data, k=5.
Hanya pembanding untuk BUGS_A.md A-2 (Rust memakai round-robin sendiri; bukan acuan kebenaran)."""
import numpy as np
from sklearn.model_selection import StratifiedKFold
import sklearn
y = np.array(["x"] * 11 + ["y"] * 11 + ["z"] * 11)
sizes = [len(te) for _, te in StratifiedKFold(5, shuffle=True, random_state=42).split(np.zeros(len(y)), y)]
print("sklearn", sklearn.__version__, "ukuran fold (3 kelas x 11, k=5):", sizes)
