import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2]);
for (const file of fs.readdirSync(dir).filter(f => /^A\d.*\.svg$/.test(f))) {
  const input = path.join(dir, file);
  const output = input.replace(/\.svg$/, '.png');
  await sharp(input, { density: 72 }).resize({ width: 3360, height: 2376 }).withMetadata({ density: 203.2 }).png().toFile(output);
  const meta = await sharp(output).metadata();
  console.log(JSON.stringify({ file: path.basename(output), width: meta.width, height: meta.height }));
}
