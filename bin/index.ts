#!/usr/bin/env tsx

import path from "path";
import fs from "fs";
import { exit, cwd } from "process";
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { Command } from "commander";
import { mkdirp } from "mkdirp";
import sharp from "sharp";
import ProgressBar from "progress";
import { globSync } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json")).toString());

const EXPECTED_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];

const program = new Command();

program.name('imagsharp');

program.version(`${pkg.version}`, "-v, --version", "View the version of the CLI");

program.requiredOption("-d, --dest <dest>", "The destination folder", "./imagsharp-dest");

program.option("-e, --expected-exts [expectedExts]", "File types to compress");

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
  console.log(chalk.blue(newPath));
  await newImg.toFile(newPath);
};

const findCommonPrefix = (strings: string[]) => {
  if (!Array.isArray(strings) || strings.length === 0) {
    return "";
  }

  const firstString = strings[0];
  let commonPrefix = "";

  for (let i = 0; i < firstString.length; i++) {
    const currentChar = firstString[i];

    if (strings.every(str => str[i] === currentChar)) {
      commonPrefix += currentChar;
    } else {
      break;
    }
  }

  return commonPrefix;
}

program.argument("<source...>", "Target file or folder to compress").action(async (source, opts) => {
  if (!Array.isArray(source) || source.length === 0) {
    console.error(chalk.red("Invalid Input"));
    return;
  }
  
  const expectedExts: string[] =
    typeof opts.expectedExts === "string" ? opts.expectedExts.split(",") : EXPECTED_EXTS;
  const TARGET = opts.dest || "./imagsharp-dest";
  
  let imgList: string[] = [];

  source = source.map((p) => path.resolve(cwd(), p));
  const root = findCommonPrefix(source);
  const _getFiles = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      if (fs.lstatSync(filePath).isDirectory()) {
        imgList = imgList.concat(globSync(
          `${root.split(path.sep).join("/")}/**/*.${expectedExts.length === 1 ? expectedExts.join(",") : `{${expectedExts.join(",")}}`}`
        ));
      } else {
        imgList.push(filePath);
      }
    } else {
      imgList = imgList.concat(globSync(filePath.split(path.sep).join("/")));
    }
  };
  for (let i = 0; i < source.length; i++) {
    _getFiles(source[i]);
  }

  if (imgList.length === 0) {
    console.error(chalk.red("Source files does not exist"));
    return;
  }

  const progressBar = new ProgressBar("[:bar] :percent", {
    width: 50,
    total: imgList.length,
    complete: "=",
    incomplete: " ",
  });
  
  const prList: Promise<void>[] = [];
  imgList.forEach(async (imgPath) => {
    prList.push(new Promise<void>((resolve) => {
      const pathObj = path.parse(imgPath);

      if (!expectedExts.map((ext) => `.${ext}`).includes(pathObj.ext)) {
        progressBar.tick();
        resolve();
        return;
      }

      const dir = path.resolve(cwd(), TARGET, pathObj.dir.slice(root.length + 1));

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
  console.log(chalk.green("imagsharp successful!"));
  exit(0);
});

program.parse(process.argv);