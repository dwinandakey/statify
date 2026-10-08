#!/usr/bin/env bash
# Menjalankan K1, K1w, K2, K3, K3N, K3w, K5, K5w untuk satu dataset (pilkada | sms_spam | smsa).
# Pemakaian: WEKA_JAR=... CNB_JAR=... bash run_all.sh <dataset>
# Keluaran: out/<dataset>/{train,test}_<K>.arff, pred_<K>.csv ; log: logs/<dataset>/<K>_{filter,summary}.log
# Opsional: KS="K1 K1w" membatasi langkah (K1 K1w K5 K5w K2 K3) agar tiap panggilan singkat.
# BUKAN hasil evaluasi final: dipakai untuk memastikan perintah berjalan dan sebagai titik rujukan.
# K3 = ComplementNaiveBayes -S 1.0 (tanpa -N, setara Statify menurut kode sumber paket); K3N = dengan -N (pembanding).
set -u
DS="${1:?dataset: pilkada|sms_spam|smsa}"
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
JAVA="${JAVA:-java}"; JOPTS="${JOPTS:--Dfile.encoding=UTF-8 -Xmx2g}"; WJ="${WEKA_JAR:?set WEKA_JAR}"; CJ="${CNB_JAR:-}"
J="$JAVA $JOPTS -cp $WJ"; JC="$JAVA $JOPTS -cp $WJ:$CJ"
FA="weka.filters.unsupervised.attribute"; CB="weka.classifiers.bayes"
O="out/$DS"; L="logs/$DS"; mkdir -p "$O" "$L"
TR="data/${DS}_train.arff"; TE="data/${DS}_test.arff"
flt(){ $J $FA.StringToWordVector -b -i $TR -o $O/train_$1.arff -r $TE -s $O/test_$1.arff -c last $2 > $L/$1_filter.log 2>&1; }
cls(){ # nama_data nama_hasil kelas jarvar [opsi]
  local run="$J"; [ "$4" = c ] && run="$JC"
  $run $3 $5 -t $O/train_$1.arff -T $O/test_$1.arff -c first -s 42 > $L/$2_summary.log 2>&1
  $run $3 $5 -t $O/train_$1.arff -T $O/test_$1.arff -c first -s 42 -classifications "weka.classifiers.evaluation.output.prediction.CSV -distribution -decimals 16 -file $O/pred_$2.csv" > /dev/null 2>&1; }
want(){ [ -z "${KS:-}" ] || [[ " $KS " == *" $1 "* ]]; }
want K1  && { flt K1  "-R first -W 1000 -O -L -C -M 1";               cls K1  K1  $CB.NaiveBayesMultinomial j ""; }
want K1w && { flt K1w "-R first -W 1000000 -O -L -C -M 1";            cls K1w K1w $CB.NaiveBayesMultinomial j ""; }
want K5  && { flt K5  "-R first -W 1000 -O -L -C -T -I -N 1 -M 1";    cls K5  K5  $CB.NaiveBayesMultinomial j ""; }
want K5w && { flt K5w "-R first -W 1000000 -O -L -C -T -I -N 1 -M 1"; cls K5w K5w $CB.NaiveBayesMultinomial j ""; }
want K2 && { flt K2b "-R first -W 1000 -O -L -M 1"
$J $FA.NumericToNominal -b -i $O/train_K2b.arff -o $O/train_K2.arff -r $O/test_K2b.arff -s $O/test_K2.arff -R 2-last > $L/K2_nominal.log 2>&1
cls K2 K2 $CB.NaiveBayes j ""; }
if ! want K3; then :
elif [ -n "$CJ" ] && [ -f "$CJ" ]; then
  cls K1  K3  $CB.ComplementNaiveBayes c "-S 1.0"
  cls K1  K3N $CB.ComplementNaiveBayes c "-N -S 1.0"
  cls K1w K3w $CB.ComplementNaiveBayes c "-S 1.0"
else echo "CNB_JAR tidak diset: K3 dilewati" > $L/K3_NOTRUN.log; fi
echo "selesai $DS"
