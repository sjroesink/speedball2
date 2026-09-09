import ghidra.app.script.GhidraScript;
import ghidra.pcode.emu.*;
import ghidra.pcode.exec.PcodeExecutorStatePiece.Reason;
import java.nio.file.*;
import java.nio.ByteBuffer;
public class CompareOriginalRandom extends GhidraScript {
 public void run() throws Exception {
  if(getScriptArgs().length<1||getScriptArgs().length>2)throw new IllegalArgumentException("Output CSV required");
  var emu=new PcodeEmulator(currentProgram.getLanguage());EmulatorUtilities.loadProgram(emu,currentProgram);
  var thread=emu.newThread();var state=thread.getState();var ar=thread.getArithmetic();
  long[][] seeds={{0x31415926L,0x53589793L},{0,0},{1,0},{0xffffffffL,0xffffffffL},{0x0000ffffL,1},{0xffff0000L,0x0000ffffL}};
  var csv=new StringBuilder("seed0,seed1,step,value,state0,state1\n");
  for(var seed:seeds){
   state.setVar(toAddr(0x14ec4),4,false,ar.fromConst(seed[0],4));
   state.setVar(toAddr(0x14ec8),4,false,ar.fromConst(seed[1],4));
   state.setVar(currentProgram.getRegister("D1"),ar.fromConst(0,4));
   state.setVar(currentProgram.getRegister("D2"),ar.fromConst(0,4));
   state.setVar(currentProgram.getCompilerSpec().getStackPointer(),ar.fromConst(0x70000,4));
   for(int n=0;n<256;n++){
    monitor.checkCancelled();thread.overrideCounter(toAddr(0x14e78));int count=0;
    while(!thread.getCounter().equals(toAddr(0x14eac))){
     if(++count>32)throw new IllegalStateException("Instruction bound exceeded");
     long pc=thread.getCounter().getOffset();
     thread.stepInstruction();
     // Ghidra 12.1.3 ADDX semantics omit X <- C. Motorola PRM 4-13 requires it.
     // This repairs emulator flags only; no original instructions are replaced.
     if((pc==0x14e88||pc==0x14e92)&&!(getScriptArgs().length==2&&getScriptArgs()[1].equals("raw")))
      state.setVar(currentProgram.getRegister("XF"),state.getVar(currentProgram.getRegister("CF"),Reason.INSPECT));
    }
    long value=state.inspectRegisterValue(currentProgram.getRegister("D0")).getUnsignedValue().longValue()&255;
    long a=Integer.toUnsignedLong(ByteBuffer.wrap(state.getVar(toAddr(0x14ec4),4,false,Reason.INSPECT)).getInt());
    long b=Integer.toUnsignedLong(ByteBuffer.wrap(state.getVar(toAddr(0x14ec8),4,false,Reason.INSPECT)).getInt());
    csv.append(seed[0]).append(',').append(seed[1]).append(',').append(n).append(',').append(value).append(',').append(a).append(',').append(b).append('\n');
   }
  }
  Files.writeString(Path.of(getScriptArgs()[0]),csv.toString());println("Executed 1536 consecutive original random calls across six seeds");
 }
}
