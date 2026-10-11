#!/usr/bin/env bash
# Uji asap (smoke test) perintah CLI K1,K2,K5,K1w,K5w pada pilkada. BUKAN hasil resmi evaluasi:
# hanya memastikan setiap perintah di 00_ENV_dan_pemetaan_opsi.md berjalan dan posisi atribut kelas benar.
# Env: JAVA (default java), WEKA_JAR (wajib), JOPTS (default -Dfile.encoding=UTF-8 -Xmx2g).
# Keluaran: out/*.arff, out/pred_<K>.csv ; log mentah: logs/smoke_<K>_{filter,classify}.log
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
JAVA="${JAVA:-java}"; JOPTS="${JOPTS:--Dfile.encoding=UTF-8 -Xmx2g}"; WJ="${WEKA_JAR:?set WEKA_JAR}"
J="$JAVA $JOPTS -cp $WJ"; FA="weka.filters.unsupervised.attribute"; CB="weka.classifiers.bayes"
mkdir -p out logs
flt(){ # nama, opsi STWV
  $J $FA.StringToWordVector -b -i data/pilkada_train.arff -o out/train_$1.arff -r data/pilkada_test.arff -s out/test_$1.arff -c last $2 > logs/smoke_$1_filter.log 2>&1; }
cls(){ # nama, kelas, [opsi tambahan]
  $J $2 -t out/train_$1.arff -T out/test_$1.arff -c first -s 42 > logs/smoke_$1_classify.log 2>&1
  $J $2 -t out/train_$1.arff -T out/test_$1.arff -c first -s 42 -classifications "weka.classifiers.evaluation.output.prediction.CSV -distribution -decimals 16 -file out/pred_$1.csv" > /dev/null 2>&1; }
flt K1  "-R first -W 1000 -O -L -C -M 1";                cls K1  $CB.NaiveBayesMultinomial
flt K1w "-R first -W 1000000 -O -L -C -M 1";             cls K1w $CB.NaiveBayesMultinomial
flt K5  "-R first -W 1000 -O -L -C -T -I -N 1 -M 1";     cls K5  $CB.NaiveBayesMultinomial
flt K5w "-R first -W 1000000 -O -L -C -T -I -N 1 -M 1";  cls K5w $CB.NaiveBayesMultinomial
# K2: biner -> NumericToNominal (atribut 2..last; kelas ada di posisi 1) -> NaiveBayes
flt K2b "-R first -W 1000 -O -L -M 1"
$J $FA.NumericToNominal -b -i out/train_K2b.arff -o out/train_K2.arff -r out/test_K2b.arff -s out/test_K2.arff -R 2-last > logs/smoke_K2_nominal.log 2>&1
cls K2 $CB.NaiveBayes
echo selesai
