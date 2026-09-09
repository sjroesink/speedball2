import ghidra.app.script.GhidraScript;
import ghidra.pcode.emu.*;
import ghidra.pcode.exec.PcodeExecutorStatePiece.Reason;
import java.nio.file.*;
public class CompareOriginalDamage extends GhidraScript {
 public void run() throws Exception {
  if(getScriptArgs().length!=1)throw new IllegalArgumentException("Output CSV required");
  var emu=new PcodeEmulator(currentProgram.getLanguage());EmulatorUtilities.loadProgram(emu,currentProgram);
  var thread=emu.newThread();var state=thread.getState();var ar=thread.getArithmetic();
  var csv=new StringBuilder("power,stamina,energy,base,remaining,agr,att,def,spd,thr,pow,sta,int\n");
  int[] stats={100,140,170,200,204,205,249,250};
  for(int power:stats)for(int stamina:stats)for(int energy:new int[]{1,8,16,64,127,128})for(int base:new int[]{100,101,173,250}){
   monitor.checkCancelled();
   state.setVar(currentProgram.getRegister("A4"),ar.fromConst(0x631e,4));
   state.setVar(currentProgram.getRegister("A5"),ar.fromConst(0x6400,4));
   state.setVar(currentProgram.getRegister("D0"),ar.fromConst(0,4));
   state.setVar(currentProgram.getRegister("D1"),ar.fromConst(0,4));
   for(int a=0;a<8;a++)state.setVar(toAddr(0x6448+a),1,false,new byte[]{(byte)base});
   state.setVar(toAddr(0x631e+0x4d),1,false,new byte[]{(byte)power});
   state.setVar(toAddr(0x644e),1,false,new byte[]{(byte)stamina});
   state.setVar(toAddr(0x6445),1,false,new byte[]{(byte)energy});
   thread.overrideCounter(toAddr(0x1061a));int steps=0;
   // Stop before equipment-drop callback; this measures damage and deterioration.
   while(!thread.getCounter().equals(toAddr(0x10668))){
    if(++steps>128)throw new IllegalStateException("Instruction bound exceeded");
    thread.stepInstruction();
   }
   csv.append(power).append(',').append(stamina).append(',').append(energy).append(',').append(base);
   csv.append(',').append(state.getVar(toAddr(0x6445),1,false,Reason.INSPECT)[0]&255);
   for(int a=0;a<8;a++)csv.append(',').append(state.getVar(toAddr(0x6448+a),1,false,Reason.INSPECT)[0]&255);
   csv.append('\n');
  }
  Files.writeString(Path.of(getScriptArgs()[0]),csv.toString());println("Executed 1536 original damage cases");
 }
}
