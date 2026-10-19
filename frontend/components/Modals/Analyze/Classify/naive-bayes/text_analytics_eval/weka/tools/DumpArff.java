import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import weka.core.Attribute;
import weka.core.Instances;
import weka.core.converters.ConverterUtils.DataSource;

/**
 * Membaca ARFF dengan jalur pembaca yang sama dengan CLI WEKA (ConverterUtils.DataSource),
 * lalu menulis CSV (UTF-8, semua sel dikutip, tanda kutip ganda digandakan) agar teks dapat
 * dibandingkan persis dengan CSV sumber. Pemakaian:
 *   java -Dfile.encoding=UTF-8 -cp weka.jar:tools DumpArff in.arff out.csv
 * Hanya berkas baru untuk verifikasi; tidak mengubah WEKA maupun kode Statify.
 */
public class DumpArff {
  static String q(String s) {
    return "\"" + s.replace("\"", "\"\"") + "\"";
  }

  public static void main(String[] a) throws Exception {
    Instances d = DataSource.read(a[0]);
    System.out.println("relation=" + d.relationName());
    System.out.println("numInstances=" + d.numInstances());
    System.out.println("numAttributes=" + d.numAttributes());
    for (int i = 0; i < d.numAttributes(); i++) {
      Attribute at = d.attribute(i);
      System.out.println("attr[" + i + "]=" + at.name() + " type=" + Attribute.typeToString(at)
          + (at.isNominal() ? " values=" + java.util.Collections.list(at.enumerateValues()) : ""));
    }
    try (PrintWriter w = new PrintWriter(new OutputStreamWriter(new FileOutputStream(a[1]), "UTF-8"))) {
      w.print("text,label\n");
      for (int i = 0; i < d.numInstances(); i++) {
        w.print(q(d.instance(i).stringValue(0)) + "," + q(d.instance(i).stringValue(d.numAttributes() - 1)) + "\n");
      }
    }
  }
}
