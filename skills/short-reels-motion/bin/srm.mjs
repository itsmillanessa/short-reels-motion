// Runs the Short Reels Motion CLI that ships next to this skill: bin/srm (macOS, Linux, Git Bash) and bin\srm.cmd
// (Windows: PowerShell, cmd) both call this file. Node resolves a linked skill folder (a symlink, or a junction on
// Windows) to the real one, so the CLI is found three folders up whatever path the agent used.
// No fallback to `npx short-reels-motion`: that name is not published on npm, and whoever registered it would have
// their code run by the skill without a question.
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const cli = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'cli', 'om.js');
if (existsSync(cli)) await import(pathToFileURL(cli).href);
else {
  console.error(`srm: no encuentro el CLI de Short Reels Motion junto a este skill (${cli}).
Instálalo: https://github.com/itsmillanessa/short-reels-motion#instalar  (o usa el comando srm / short-reels-motion)`);
  process.exitCode = 127;
}
