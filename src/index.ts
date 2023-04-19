import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { Command } from "commander";
import { mkdirp } from "mkdirp";
import sharp from "sharp";
import ProgressBar from "progress";
// import ora from "ora";
import { cwd } from 'node:process';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program.name('imagsharp');

program.version(`${pkg.version}`, "-v, --version", "View the version of the CLI");

program.requiredOption("-d, --dest <dest>", "The destination folder");

program.option("-w, --width [width]", "The width of the picture");

program.option("-f, --format [format]", "The media type of the picture");

program.option("-q, --quality [quality]", "Picture quality", "80");

const edit = async (
  imgPath: string,
  pathObj: path.ParsedPath,
  dir: string,
  _width: number,
  quality: number,
  _format: string
) => {
  const img = sharp(imgPath);
  const metadata = await img.metadata();
  const width = _width || metadata.width;
  const ext = pathObj.ext;
  const name = pathObj.name;
  const format = _format || ext.slice(1);

  let newImg: sharp.Sharp;
  switch (format) {
    case "png":
      newImg = img.resize(width).png({ quality });
      break;

    case "webp":
      newImg = img.resize(width).webp({ quality, alphaQuality: 100 });
      break;

    default:
      newImg = img.resize(width).jpeg({ quality });
      break;
  }

  const newPath = `${dir}/${name}.${format}`;
  await newImg.toFile(newPath);
};

program.argument("<source...>").action((source, opts) => {
  const imgList = source as string[];
  const TARGET = opts.dest || "";

  const progressBar = new ProgressBar("[:bar] :percent", {
    width: 50,
    total: imgList.length,
    complete: "=",
    incomplete: " ",
  });
  
  imgList.forEach(async (imgPath, idx) => {
    const pathObj = path.parse(imgPath);
    
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(pathObj.ext)) {
      progressBar.tick();
      return;
    }

    const dirArr = path.normalize(pathObj.dir).split(path.sep);

    let subDir = "";
    for (let i = 1; i < dirArr.length; i++) {
      subDir += `/${dirArr[i]}`;
    }
    if (subDir.length > 0) {
      subDir = subDir.slice(1);
    }

    const dir = path.resolve(
      cwd(),
      `${path.normalize(TARGET)}/${subDir}`
    );
  
    if (!fs.existsSync(dir)) {
      mkdirp.sync(dir);
    }

    let width = 0;
    if (typeof opts.width === "string" && opts.width.length > 0) {
      const _width = parseInt(opts.width);
      if (!isNaN(_width)) {
        width = _width;
      }
    }

    let quality = 0;
    if (typeof opts.quality === "string" && opts.quality.length > 0) {
      const _quality = parseInt(opts.quality);
      if (!isNaN(_quality)) {
        quality = _quality;
      } else {
        quality = 80;
      }
    }
  
    await edit(imgPath, pathObj, dir, width, quality, opts.format);
    
    progressBar.tick();

    if (idx === imgList.length - 1) {
      console.log(chalk.green("imgsharp successful!"));
    }
  });
});

program.parse(process.argv);