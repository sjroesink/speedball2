import ghidra.app.script.GhidraScript;
import ghidra.pcode.emu.*;
import java.nio.file.*;
public class CompareOriginalTackle extends GhidraScript {
 public void run() throws Exception {
  if(getScriptArgs().length!=1)throw new IllegalArgumentException("Output CSV required");
  var emu=new PcodeEmulator(currentProgram.getLanguage());EmulatorUtilities.loadProgram(emu,currentProgram);
  var thread=emu.newThread();var state=thread.getState();var ar=thread.getArithmetic();
  var csv=new StringBuilder("attack,defense,angle,slide,jump,keeper,threshold\n");
  int[] stats={100,140,170,200,204,205,249,250};
  for(int attack:stats)for(int defense:stats)for(int angle=0;angle<8;angle++)
   for(int flags=0;flags<8;flags++){
    monitor.checkCancelled();int slide=flags&1,jump=(flags>>1)&1,keeper=(flags>>2)&1;
    state.setVar(currentProgram.getRegister("A4"),ar.fromConst(0x631e,4));
    state.setVar(currentProgram.getRegister("A5"),ar.fromConst(0x6400,4));
    state.setVar(currentProgram.getRegister("D0"),ar.fromConst(0,4));
    state.setVar(toAddr(0x631e+0x49),1,false,new byte[]{(byte)attack});
    state.setVar(toAddr(0x6400+0x4a),1,false,new byte[]{(byte)defense});
    state.setVar(toAddr(0x631e+0x1e),1,false,new byte[]{0});
    state.setVar(toAddr(0x6400+0x1e),1,false,new byte[]{(byte)angle});
    state.setVar(toAddr(0x631e+0x22),1,false,new byte[]{(byte)(slide*32)});
    state.setVar(toAddr(0x6400+0x22),1,false,new byte[]{(byte)(jump*2)});
    state.setVar(toAddr(0x6400+0x47),1,false,new byte[]{(byte)(1-keeper)});
    thread.overrideCounter(toAddr(0x105ba));int steps=0;
    while(!thread.getCounter().equals(toAddr(0x10618))){
     if(++steps>64)throw new IllegalStateException("Instruction bound exceeded");
     thread.stepInstruction();
    }
    long result=state.inspectRegisterValue(currentProgram.getRegister("D4")).getUnsignedValue().longValue()&255;
    csv.append(attack).append(',').append(defense).append(',').append(angle).append(',').append(slide).append(',').append(jump).append(',').append(keeper).append(',').append(result).append('\n');
   }
  Files.writeString(Path.of(getScriptArgs()[0]),csv.toString());println("Executed 4096 original tackle threshold cases");
 }
}
