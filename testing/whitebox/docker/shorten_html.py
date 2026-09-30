"""Memendekkan path laporan HTML llvm-cov agar muat di batas path Windows.

llvm-cov menyalin path absolut sumber di container:
  html/coverage/repo/frontend/components/Modals/Analyze/general-linear-model/<crate>/rust/src/...
Skrip ini memindahkannya ke html/src/... lalu menyesuaikan tautan:
  - index.html: 'coverage/repo/.../rust/src/' -> 'src/';
  - halaman berkas: rantai '../' ke style.css/control.js dikurangi sebanyak
    segmen yang dihapus (9).
Isi laporan tidak berubah. Jalankan sesudah run-coverage.sh:
  python testing/whitebox/docker/shorten_html.py
"""
import pathlib
import re
import shutil

COV = pathlib.Path(__file__).resolve().parent.parent / "coverage"

for html in sorted(COV.glob("rust-*/html")):
    base = html / "coverage"
    srcs = list(base.glob("repo/frontend/components/Modals/Analyze/general-linear-model/*/rust/src"))
    if not srcs:
        continue
    src = srcs[0]
    removed = len(src.relative_to(html).parts) - 1  # segmen di antara html/ dan src/
    prefix = "/".join(src.relative_to(html).parts) + "/"
    target = html / "src"
    shutil.move(str(src), str(target))
    shutil.rmtree(base)
    for page in target.rglob("*.html"):
        text = page.read_text(encoding="utf-8")
        text = re.sub(r"((?:\.\./)+)", lambda m: "../" * (m.group(1).count("../") - removed), text)
        page.write_text(text, encoding="utf-8", newline="\n")
    index = html / "index.html"
    index.write_text(index.read_text(encoding="utf-8").replace(prefix, "src/"), encoding="utf-8", newline="\n")
    longest = max(len(str(p.relative_to(COV.parent.parent.parent))) for p in html.rglob("*"))
    print(f"{html.parent.name}: {prefix} -> src/ (path relatif repo terpanjang {longest} karakter)")
