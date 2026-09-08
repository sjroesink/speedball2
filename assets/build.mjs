import { spawnSync } from "node:child_process";
const blender =
  process.env.BLENDER_PATH ||
  (process.platform === "win32"
    ? "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
    : "blender");
const result = spawnSync(
  blender,
  ["--background", "--python-exit-code", "1", "--python", "assets/build.py"],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
