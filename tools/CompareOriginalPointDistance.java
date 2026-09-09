import ghidra.app.script.GhidraScript;
import ghidra.pcode.emu.*;
import java.nio.file.*;
public class CompareOriginalPointDistance extends GhidraScript {
 public void run() throws Exception {
  if(getScriptArgs().length!=1)throw new IllegalArgumentException("Output CSV required");
  var emu=new PcodeEmulator(currentProgram.getLanguage());EmulatorUtilities.loadProgram(emu,currentProgram);
  var thread=emu.newThread();var state=thread.getState();var ar=thread.getArithmetic();
  var csv=new StringBuilder("sprite,dx,dz,origin,distance\n");
  int[] deltas={-64,-32,-16,-1,0,1,16,32,64};
  for(int sprite=0;sprite<117;sprite++)for(int dx:deltas)for(int dz:deltas){
   monitor.checkCancelled();
   state.setVar(currentProgram.getRegister("D0"),ar.fromConst(0,4));
   state.setVar(currentProgram.getRegister("D3"),ar.fromConst(0,4));
   short origin=getShort(toAddr(0x40e2+sprite*4+2));
   state.setVar(currentProgram.getRegister("A5"),ar.fromConst(0x631e,4));
   state.setVar(currentProgram.getCompilerSpec().getStackPointer(),ar.fromConst(0x70000,4));
   state.setVar(currentProgram.getRegister("D1"),ar.fromConst(320+dz,4));
   state.setVar(currentProgram.getRegister("D2"),ar.fromConst(576-dx,4));
   state.setVar(toAddr(0x631e+0x14),2,false,ar.fromConst(320,2));
   state.setVar(toAddr(0x631e+0x16),2,false,ar.fromConst(576,2));
   state.setVar(toAddr(0x631e+0x26),2,false,ar.fromConst(origin,2));
   thread.overrideCounter(toAddr(0xdaca));int count=0;
   while(!thread.getCounter().equals(toAddr(0xdaf4))){
    if(++count>64)throw new IllegalStateException("Instruction bound exceeded at "+thread.getCounter());
    thread.stepInstruction();
   }
   long result=state.inspectRegisterValue(currentProgram.getRegister("D0")).getUnsignedValue().longValue()&65535;
   csv.append(sprite).append(',').append(dx).append(',').append(dz).append(',').append(origin).append(',').append(result).append('\n');
  }
  Files.writeString(Path.of(getScriptArgs()[0]),csv.toString());println("Executed 9477 original point-distance cases");
 }
}
