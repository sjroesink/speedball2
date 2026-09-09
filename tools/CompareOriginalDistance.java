import ghidra.app.script.GhidraScript;
import ghidra.pcode.emu.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;

// Run the actual vector_length instructions; retain only numeric measurements.
public class CompareOriginalDistance extends GhidraScript {
 public void run() throws Exception {
  if(getScriptArgs().length!=1)throw new IllegalArgumentException("Output CSV required");
  PcodeEmulator emu=new PcodeEmulator(currentProgram.getLanguage());
  EmulatorUtilities.loadProgram(emu,currentProgram);
  PcodeThread<byte[]> thread=emu.newThread();
  var state=thread.getState();var arithmetic=thread.getArithmetic();
  var values=new ArrayList<Integer>();
  for(int n=0;n<=64;n++)values.add(n);
  for(int n:new int[]{96,100,127,128,160,192,255,256,320,512,576,640,1024,1120,1152})values.add(n);
  StringBuilder csv=new StringBuilder("dx,dz,distance,instructions\n");
  for(int dx:values)for(int dz:values){
   monitor.checkCancelled();
   state.setVar(currentProgram.getRegister("D0"),arithmetic.fromConst(dx,4));
   state.setVar(currentProgram.getRegister("D3"),arithmetic.fromConst(dz,4));
   thread.overrideCounter(toAddr(0xdaf6));
   int count=0;
   while(!thread.getCounter().equals(toAddr(0xdb1a))&&!thread.getCounter().equals(toAddr(0xdb20))){
    if(++count>32)throw new IllegalStateException("Instruction bound exceeded");
    thread.stepInstruction();
   }
   long result=state.inspectRegisterValue(currentProgram.getRegister("D1")).getUnsignedValue().longValue()&65535;
   csv.append(dx).append(',').append(dz).append(',').append(result).append(',').append(count).append('\n');
  }
  Files.writeString(Path.of(getScriptArgs()[0]),csv.toString());
  println("Executed original vector_length for "+values.size()*values.size()+" input pairs");
 }
}
