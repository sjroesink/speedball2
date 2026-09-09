import ghidra.app.script.GhidraScript;
import ghidra.pcode.emu.*;
import java.nio.file.*;

public class CompareOriginalPrediction extends GhidraScript {
 public void run() throws Exception {
  if(getScriptArgs().length!=1)throw new IllegalArgumentException("Output CSV required");
  var emu=new PcodeEmulator(currentProgram.getLanguage());EmulatorUtilities.loadProgram(emu,currentProgram);
  var thread=emu.newThread();var state=thread.getState();var ar=thread.getArithmetic();
  thread.overrideCounter(toAddr(0x84ac));int steps=0;
  while(!thread.getCounter().equals(toAddr(0x84c4))){
   if(++steps>2048)throw new IllegalStateException("Table initialization exceeded bound");
   thread.stepInstruction();
  }
  var csv=new StringBuilder("intelligence,x,y,dx,dy,targetX,targetY\n");
  int count=0;
  for(int intelligence:new int[]{100,149,150,199,200,249,250})
   for(int x:new int[]{32,33,64,320,576,607,608})
    for(int y:new int[]{32,33,64,576,1088,1119,1120})
     for(int dx:new int[]{-8,-1,0,1,8})for(int dy:new int[]{-8,-1,0,1,8}){
      monitor.checkCancelled();
      state.setVar(currentProgram.getRegister("A5"),ar.fromConst(0x631e,4));
      state.setVar(currentProgram.getRegister("A0"),ar.fromConst(0x6400,4));
      state.setVar(currentProgram.getRegister("D1"),ar.fromConst(0,4));
      state.setVar(currentProgram.getRegister("D2"),ar.fromConst(0,4));
      state.setVar(currentProgram.getCompilerSpec().getStackPointer(),ar.fromConst(0x70000,4));
      state.setVar(toAddr(0x631e+0x4f),1,false,ar.fromConst(intelligence,1));
      state.setVar(toAddr(0x6400+0x14),2,false,ar.fromConst(x,2));
      state.setVar(toAddr(0x6400+0x16),2,false,ar.fromConst(y,2));
      state.setVar(toAddr(0x6400+0x18),2,false,ar.fromConst(dx,2));
      state.setVar(toAddr(0x6400+0x1a),2,false,ar.fromConst(dy,2));
      thread.overrideCounter(toAddr(0x10aaa));steps=0;
      while(!thread.getCounter().equals(toAddr(0x10ae6))){
       if(++steps>80)throw new IllegalStateException("Prediction exceeded instruction bound");
       thread.stepInstruction();
      }
      long tx=state.inspectRegisterValue(currentProgram.getRegister("D1")).getUnsignedValue().longValue()&65535;
      long ty=state.inspectRegisterValue(currentProgram.getRegister("D2")).getUnsignedValue().longValue()&65535;
      csv.append(intelligence).append(',').append(x).append(',').append(y).append(',').append(dx).append(',').append(dy).append(',').append(tx).append(',').append(ty).append('\n');
      count++;
     }
  Files.writeString(Path.of(getScriptArgs()[0]),csv.toString());println("Executed "+count+" original prediction cases");
 }
}
