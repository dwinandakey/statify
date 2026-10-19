# -*- coding: utf-8 -*-
"""Inti analisis basis path (Track B): graf alir, enumerasi jalur, metrik, himpunan basis.
Dipakai oleh wb_gen.py. Hanya butuh Python 3 + numpy. Tidak mengubah kode produksi."""
import itertools, subprocess
import numpy as np


class Graph:
    def __init__(self, key, title):
        self.key, self.title = key, title
        self.nodes = {}      # id -> dict(kind,label,stmt,line,msg)
        self.order = []
        self.edges = []      # (src,dst,label)
        self.succ = {}

    def node(self, nid, kind, label, stmt="", line=None, **extra):
        self.nodes[nid] = dict(kind=kind, label=label, stmt=stmt, line=line, **extra)
        self.order.append(nid)

    def edge(self, a, b, lab=""):
        self.edges.append((a, b, lab))
        self.succ.setdefault(a, {})[lab] = b

    # nomor tampilan: S, 1..n, X
    def num(self):
        m, k = {}, 0
        for nid in self.order:
            kd = self.nodes[nid]["kind"]
            if kd == "start":
                m[nid] = "S"
            elif kd == "end":
                m[nid] = "X"
            else:
                k += 1
                m[nid] = str(k)
        return m

    def preds(self):
        return [n for n in self.order if self.nodes[n]["kind"] == "pred"]

    def metrics(self):
        N, E, P = len(self.nodes), len(self.edges), len(self.preds())
        return dict(N=N, E=E, P=P, VG=E - N + 2, P1=P + 1)

    def enum_paths(self, max_visit=2):
        start = [n for n in self.order if self.nodes[n]["kind"] == "start"][0]
        end = [n for n in self.order if self.nodes[n]["kind"] == "end"][0]
        out = []

        def dfs(n, path, cnt):
            if n == end:
                out.append(tuple(path)); return
            for lab, d in self.succ.get(n, {}).items():
                if cnt.get(d, 0) >= max_visit:
                    continue
                cnt[d] = cnt.get(d, 0) + 1
                path.append(d)
                dfs(d, path, cnt)
                path.pop()
                cnt[d] -= 1

        dfs(start, [start], {start: 1})
        return out

    def vec(self, path):
        idx = {(a, b): i for i, (a, b, _) in enumerate(self.edges)}
        v = np.zeros(len(self.edges))
        for a, b in zip(path, path[1:]):
            v[idx[(a, b)]] += 1
        return v

    def outcomes(self, path):
        """daftar (id predikat, 'T'/'F') sesuai urutan kunjungan"""
        res = []
        for a, b in zip(path, path[1:]):
            if self.nodes[a]["kind"] == "pred":
                lab = [l for l, d in self.succ[a].items() if d == b][0]
                res.append((a, lab))
        return res

    # ---------------- DOT ----------------
    def dot(self):
        num = self.num()
        L = ['digraph G {', '  rankdir=TB; nodesep=0.35; ranksep=0.38;',
             '  node [fontname="Helvetica", fontsize=10, margin="0.08,0.04"];',
             '  edge [fontname="Helvetica", fontsize=9];',
             f'  labelloc=t; label="{self.title}"; fontsize=12; fontname="Helvetica-Bold";']
        for nid in self.order:
            n = self.nodes[nid]
            lab = (num[nid] + ": " + n["label"]) if n["kind"] not in ("start", "end") else n["label"]
            lab = lab.replace('"', '\\"')
            sh = dict(start='ellipse', end='ellipse', pred='diamond', stmt='box', ret='box')[n["kind"]]
            extra = {'start': ',style=filled,fillcolor="#d9ead3"', 'end': ',style=filled,fillcolor="#d9ead3"',
                     'pred': ',style=filled,fillcolor="#fff2cc"', 'ret': ',style=filled,fillcolor="#f4cccc"',
                     'stmt': ''}[n["kind"]]
            if n["kind"] == "ret" and n.get("ok"):
                extra = ',style=filled,fillcolor="#cfe2f3"'
            L.append(f'  "{nid}" [label="{lab}", shape={sh}{extra}];')
        for a, b, lab in self.edges:
            l = f' [label="{lab}"]' if lab else ''
            L.append(f'  "{a}" -> "{b}"{l};')
        L.append('}')
        return "\n".join(L) + "\n"


def rank(vs):
    return int(np.linalg.matrix_rank(np.array(vs))) if vs else 0


def baseline_basis(g, feasible, baseline, target=None, weak=lambda p: False):
    """Metode baseline McCabe: balik satu predikat pada tiap jalur yang sudah ada,
    lanjutkan dengan penyelesaian layak terpendek. Kembalikan (basis, catatan_flip_infeasible)."""
    feasible = list(feasible)
    basis, vecs, queue, infeasible = [baseline], [g.vec(baseline)], [baseline], []
    prov = [None]
    target = target or g.metrics()["VG"]
    while queue:
        p = queue.pop(0)
        for i, n in enumerate(p[:-1]):
            if g.nodes[n]["kind"] != "pred":
                continue
            for lab, d in g.succ[n].items():
                if d == p[i + 1]:
                    continue
                prefix = p[:i + 1] + (d,)
                cands = [q for q in feasible if q[:i + 2] == prefix]
                if not cands:
                    infeasible.append((p, n, lab)); continue
                q = min(cands, key=lambda q: (weak(q), len(q), q))
                if rank(vecs + [g.vec(q)]) > len(vecs):
                    basis.append(q); vecs.append(g.vec(q)); queue.append(q)
                    prov.append((basis.index(p), n, lab))
    # pelengkap bila perlu (greedy)
    extra = []
    for q in sorted(feasible, key=lambda q: (weak(q), len(q), q)):
        if len(basis) >= target:
            break
        if rank(vecs + [g.vec(q)]) > len(vecs):
            basis.append(q); vecs.append(g.vec(q)); extra.append(q); prov.append(None)
    return basis, infeasible, extra, rank(vecs), prov


def render_png(dotfile, pngfile, dpi=110):
    subprocess.run(["dot", "-Tpng", f"-Gdpi={dpi}", dotfile, "-o", pngfile], check=True)
