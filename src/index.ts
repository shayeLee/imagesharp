#!/usr/bin/env ts-node-esm

import path from "path";
import fs from "fs";
import { stat } from "fs/promises";
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { Command } from "commander";
import { mkdirp } from "mkdirp";
import sharp from "sharp";
import ProgressBar from "progress";
import { globSync } from "glob";
import { cwd } from 'node:process';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program.name('imagsharp');

program.version(`${pkg.version}`, "-v, --version", "View the version of the CLI");

program.requiredOption("-d, --dest <dest>", "The destination folder", "./imagsharp-dest");

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
  const ext = pathObj.ext;
  let sharpOptions: sharp.SharpOptions | undefined;
  if (ext === ".gif") {
    sharpOptions = {
      animated: true,
      limitInputPixels: false
    }
  }
  const img = sharp(imgPath, sharpOptions);
  const metadata = await img.metadata();
  const width = _width || metadata.width;
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

    case "gif":
      newImg = img.gif({
        colours: Math.floor(256 * quality / 100),
      });
      break;

    default:
      newImg = img.resize(width).jpeg({ quality });
      break;
  }

  const newPath = `${dir}/${name}.${format}`;
  await newImg.toFile(newPath);
};

program.argument("<source...>").action(async (source, opts) => {
  if (!Array.isArray(source) || source.length === 0) {
    console.error(chalk.red("Invalid Input"));
    return;
  }
  
  const TARGET = opts.dest || "./imagsharp-dest";
  let imgList: string[] = [];
  let root = "";

  console.log("source =>", source);
  const _getFiles = async (path: string) => {
    try {
      const stats = await stat(path);
      console.log("stats =>", stats);
    } catch (err) {
      console.error(err);
    }
  };
  for (let i = 0; i < source.length; i++) {
    await _getFiles(source[i]);
  }

  // const assets = source[0] as string;
  // const stats = await stat(assets);
  // if (stats.isDirectory()) {
  //   root = path.resolve(cwd(), assets);
  //   imgList = globSync(root.split(path.sep).join("/") + `/**/*.{png,jpg,jpeg,webp,gif}`)
  // } else {
  //   imgList = source as string[];
  // }

  /* const progressBar = new ProgressBar("[:bar] :percent", {
    width: 50,
    total: imgList.length,
    complete: "=",
    incomplete: " ",
  });
  
  const prList: Promise<void>[] = [];
  imgList.forEach(async (_imgPath) => {
    prList.push(new Promise<void>((resolve) => {
      let imgPath = _imgPath;
      if (!path.isAbsolute(_imgPath)) {
        imgPath = path.resolve(cwd(), _imgPath);
      }
      const pathObj = path.parse(imgPath);

      if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(pathObj.ext)) {
        progressBar.tick();
        resolve();
        return;
      }

      const dir = root === ""
        ? path.resolve(cwd(), TARGET)
        : path.resolve(cwd(), TARGET, pathObj.dir.substring(root.length + 1));

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

      edit(imgPath, pathObj, dir, width, quality, opts.format).finally(() => {
        progressBar.tick();
        resolve();
      });
    }));
  });
  await Promise.allSettled(prList);
  console.log(chalk.green("imagsharp successful!")); */
});

program.parse(process.argv);