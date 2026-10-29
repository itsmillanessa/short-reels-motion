// The product's name in one place: what the CLI, the studio, the share page and the signature call it.
// Short Reels Motion is built on the huashu-motion engine by Huashu (MIT) — see NOTICE.md.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const NAME = 'Short Reels Motion';
export const SLUG = 'short-reels-motion';
export const CLI = 'srm';
export const REPO_URL = 'https://github.com/itsmillanessa/short-reels-motion';
export const UPSTREAM_URL = 'https://github.com/alchaincyf/huashu-motion';

// Where this machine's files live. New installs use the new names; a machine that already has the huashu-motion
// folders keeps using them, so an upgrade never loses experience notes, soundtracks, voice models or samples.
// SRM_HOME (or the older OM_HOME) moves the home folder.
const pick = (fresh, old) => (!existsSync(fresh) && existsSync(old) ? old : fresh);
export const homeDir = () => process.env.SRM_HOME || process.env.OM_HOME || pick(join(homedir(), '.short-reels-motion'), join(homedir(), '.huashu-motion'));
export const cacheDir = () => pick(join(homedir(), '.cache', SLUG), join(homedir(), '.cache', 'huashu-motion'));
