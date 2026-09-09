import ghidra.app.script.GhidraScript;
import java.nio.file.Files;
import java.nio.file.Path;
public class ExportBallTables extends GhidraScript {
 public void run() throws Exception {
  byte[] bytes=new byte[0x7920-0x3ff8];
  int count=currentProgram.getMemory().getBytes(toAddr(0x3ff8),bytes);
  if(count!=bytes.length)throw new Exception("Incomplete table export "+count);
  Files.write(Path.of(getScriptArgs()[0]),bytes);
  println("Numeric reference region exported: "+count+" bytes");
 }
}
