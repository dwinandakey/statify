#!/usr/bin/env python3
"""Bandingkan keluaran WEKA di Windows (out/pred_<K>.csv, logs/<K>_summary.txt) dengan Linux (out/pilkada/...). Hanya pilkada."""
import re
def rd(p): return open(p,encoding="utf-8",errors="replace").read().replace("\r\n","\n")
print("Konfigurasi | beda baris pred | beda label | maks|selisih prob| | benar uji Windows | benar uji Linux | ARFF filter (latih,uji)")
for k in ["K1","K1w","K2","K3","K3N","K3w","K5","K5w"]:
    wl=rd(f"out/pred_{k}.csv").split("\n"); ll=rd(f"out/pilkada/pred_{k}.csv").split("\n")
    nd=sum(a!=b for a,b in zip(wl,ll)); lab=sum(a.split(",")[:3]!=b.split(",")[:3] for a,b in zip(wl,ll))
    mx=0.0
    for a,b in zip(wl[1:],ll[1:]):
        for x,y in zip(a.split(",")[4:],b.split(",")[4:]):
            try: mx=max(mx,abs(float(x.strip("*"))-float(y.strip("*"))))
            except ValueError: pass
    acc=lambda s: re.findall(r"Correctly Classified Instances\s+(\d+)",s)[-1]
    kk={"K3":"K1","K3N":"K1","K3w":"K1w","K2":"K2"}.get(k,k)
    arff=[rd(f"out/{s}_{kk}.arff")==rd(f"out/pilkada/{s}_{kk}.arff") for s in ("train","test")]
    print(f"{k} | {nd} | {lab} | {mx:.2e} | {acc(rd(f'logs/{k}_summary.txt'))} | {acc(rd(f'logs/pilkada/{k}_summary.log'))} | {'identik' if all(arff) else 'BEDA'}")
