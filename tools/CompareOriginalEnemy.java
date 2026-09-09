import ghidra.app.script.GhidraScript;
import ghidra.pcode.emu.*;
import java.nio.file.*;

public class CompareOriginalEnemy extends GhidraScript {
 public void run() throws Exception {
  if(getScriptArgs().length!=1)throw new IllegalArgumentException("Output CSV required");
  var emu=new PcodeEmulator(currentProgram.getLanguage());EmulatorUtilities.loadProgram(emu,currentProgram);
  var thread=emu.newThread();var state=thread.getState();var ar=thread.getArithmetic();
  thread.overrideCounter(toAddr(0x84ac));int steps=0;
  while(!thread.getCounter().equals(toAddr(0x84c4))){
   if(++steps>2048)throw new IllegalStateException("Initialization bound");
   thread.stepInstruction();
  }
  var csv=new StringBuilder("team,intelligence,distance,flags,x,dx,selected\n");int count=0;
  for(int team=0;team<2;team++)for(int intelligence:new int[]{100,200,250})
   for(int distance:new int[]{0,199,200,499,500})for(int flags:new int[]{0,16,64,80})
    for(int x:new int[]{212,213,214})for(int dx:new int[]{-1,0,1}){
     monitor.checkCancelled();
     state.setVar(currentProgram.getRegister("A5"),ar.fromConst(0x631e,4));
     for(String name:new String[]{"D0","D1","D2","D3","D5","D6","D7","A3","A4"})
      state.setVar(currentProgram.getRegister(name),ar.fromConst(0,4));
     state.setVar(currentProgram.getCompilerSpec().getStackPointer(),ar.fromConst(0x70000,4));
     state.setVar(toAddr(0x631e+0x22),1,false,ar.fromConst(team==0?8:0,1));
     state.setVar(toAddr(0x631e+0x4f),1,false,ar.fromConst(intelligence,1));
     int[] bounds={32,213,384,768};
     for(int k=0;k<4;k++)state.setVar(toAddr(0x631e+0x36+k*2),2,false,ar.fromConst(bounds[k],2));
     for(int j=0;j<9;j++){
      int p=0x71000+j*0x100;
      state.setVar(toAddr((team==0?0x6bfe:0x6bda)+j*4),4,false,ar.fromConst(p,4));
      state.setVar(toAddr(p+0x22),1,false,ar.fromConst(j==0?flags:j==1?0:16,1));
      state.setVar(toAddr(p+0x14),2,false,ar.fromConst(j==0?x:180,2));
      state.setVar(toAddr(p+0x16),2,false,ar.fromConst(j==0&&(flags&64)!=0?450:576,2));
      state.setVar(toAddr(p+0x18),2,false,ar.fromConst(j==0?dx:0,2));
      state.setVar(toAddr(p+0x1a),2,false,ar.fromConst(0,2));
      state.setVar(toAddr(0x631e+0x60+j*2),2,false,ar.fromConst(j==0?distance:j==1?199:999,2));
     }
     thread.overrideCounter(toAddr(0xf866));steps=0;
     while(!thread.getCounter().equals(toAddr(0xf8ca))){
      if(++steps>512)throw new IllegalStateException("Enemy selection bound");
      thread.stepInstruction();
     }
     long pointer=state.inspectRegisterValue(currentProgram.getRegister("A0")).getUnsignedValue().longValue();
     int selected=pointer==0?-1:(int)((pointer-0x71000)/0x100);
     if(selected < -1 || selected>8)throw new IllegalStateException("Invalid player pointer");
     csv.append(team).append(',').append(intelligence).append(',').append(distance).append(',').append(flags).append(',').append(x).append(',').append(dx).append(',').append(selected).append('\n');count++;
    }
  Files.writeString(Path.of(getScriptArgs()[0]),csv.toString());println("Executed "+count+" original enemy-selection cases");
 }
}
