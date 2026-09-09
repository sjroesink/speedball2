import ghidra.app.script.GhidraScript;
import ghidra.pcode.emu.*;
import java.nio.file.Files;
import java.nio.file.Path;

// Execute the supplied reference program; export measurements, never its bytes.
public class CompareOriginalSustain extends GhidraScript {
 public void run() throws Exception {
  if (getScriptArgs().length != 1) throw new IllegalArgumentException("Output CSV required");
  PcodeEmulator emu = new PcodeEmulator(currentProgram.getLanguage());
  EmulatorUtilities.loadProgram(emu, currentProgram);
  // The supplied database is pre-startup: execute its table initialization first.
  PcodeThread<byte[]> init=emu.newThread();init.overrideCounter(toAddr(0x84ac));
  int initSteps=0;
  while (!init.getCounter().equals(toAddr(0x84c4))) {
   monitor.checkCancelled();
   if (++initSteps>2048) throw new IllegalStateException("Initialization bound exceeded");
   init.stepInstruction();
  }
  StringBuilder csv = new StringBuilder("speed,sustain,instructions\n");
  for (int speed=100;speed<=250;speed++) {
   monitor.checkCancelled();
   PcodeThread<byte[]> thread=emu.newThread();
   var state=thread.getState();var arithmetic=thread.getArithmetic();
   state.setVar(currentProgram.getRegister("A5"),arithmetic.fromConst(0x631e,4));
   state.setVar(toAddr(0x631e+0x4b),1,false,new byte[]{(byte)speed});
   thread.overrideCounter(toAddr(0xf564));
   int steps=0;
   while (!thread.getCounter().equals(toAddr(0xf57e))) {
    if (++steps>32) throw new IllegalStateException("Instruction bound exceeded at "+thread.getCounter());
    thread.stepInstruction();
   }
   long result=state.inspectRegisterValue(currentProgram.getRegister("D0")).getUnsignedValue().longValue()&255;
   csv.append(speed).append(',').append(result).append(',').append(steps).append('\n');
  }
  Files.writeString(Path.of(getScriptArgs()[0]),csv.toString());
  println("Executed original get_sustain for all 151 valid speed attributes");
 }
}
