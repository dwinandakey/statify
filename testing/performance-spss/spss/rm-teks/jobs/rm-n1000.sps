* Encoding: UTF-8.
* Uji performa Statify vs SPSS: rm-n1000, 11 run GLM (run 1 = pemanasan).
* Dibuat oleh testing/performance-spss/spss/make_jobs.py.
SET DECIMAL=DOT.
OMS /SELECT TABLES /IF COMMANDS=['GLM'] SUBTYPES=['Notes']
  /DESTINATION FORMAT=OXML OUTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\performance-spss\spss\rm-teks\oms\rm-n1000-notes.xml'
  /TAG='notes'.
OMS /SELECT TABLES /IF COMMANDS=['GLM']
  /DESTINATION FORMAT=OXML OUTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\performance-spss\spss\rm-teks\oms\rm-n1000-full.xml'
  /TAG='full'.
GET DATA /TYPE=TXT /FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\performance-spss\data\rm-n1000.csv' /ENCODING='UTF8'
  /DELCASE=LINE /DELIMITERS="," /ARRANGEMENT=DELIMITED /FIRSTCASE=2
  /VARIABLES=t1 F12.6 t2 F12.6 t3 F12.6 t4 F12.6 group A2.
CACHE.
EXECUTE.
* Run 1 (pemanasan).
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
OMSEND TAG=['full'].
* Run 2.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
* Run 3.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
* Run 4.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
* Run 5.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
* Run 6.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
* Run 7.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
* Run 8.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
* Run 9.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
* Run 10.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
* Run 11.
GLM t1 t2 t3 t4 BY group
  /WSFACTOR=time 4 Polynomial
  /MEASURE=score
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=time
  /DESIGN=group.
OMSEND.
