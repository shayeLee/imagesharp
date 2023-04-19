import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const content = fs.readFileSync(path.resolve(__dirname, "./bin/index.js")).toLocaleString();

fs.writeFileSync(path.resolve(__dirname, "./bin/index.js"), "#!/usr/bin/env node\r\n" + content);