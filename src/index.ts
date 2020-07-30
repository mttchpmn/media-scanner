#! /usr/bin/env node

import ProgressBar from "progress";
const ffprobe = require("ffprobe");
const ffprobeStatic = require("ffprobe-static");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

import * as path from "path";
import { promises as fs } from "fs";

type MediaObject = {
  file: string;
  filepath: string;
  codec?: string;
  width?: string;
  height?: string;
  HD?: boolean;
  duration?: string;
  aspectRatio?: string;
};

const getFiles = async (dir: string): Promise<string[]> => {
  console.log("Scanning dir: ", dir);

  const files = await fs.readdir(dir);
  return files;
};

const filterMedia = (files: string[]): string[] => {
  const validExtensions = ["avi", "mkv", "mp4", "mov"];
  const getExt = (f: string): string => f.split(".").pop() as string;

  return files.filter((f) => validExtensions.includes(getExt(f)));
};

const getMediaObject: any = async (
  dir: string,
  file: string
): Promise<MediaObject> => {
  const filepath = path.join(dir, file);

  try {
    const { streams } = await ffprobe(filepath, { path: ffprobeStatic.path });
    const data = streams[0];

    const {
      codec_name: codec,
      width,
      height,
      duration,
      display_aspect_ratio: aspectRatio,
    } = data;

    const HD = parseInt(width, 10) > 1280 ? true : false;

    const convertToMinutes = (duration: string): string => {
      if (!duration) return "Unknown";

      return Math.round(parseInt(duration, 10) / 60) + "";
    };

    return {
      file,
      filepath,
      codec,
      width,
      height,
      HD,
      duration: convertToMinutes(duration),
      aspectRatio,
    };
  } catch (error) {
    return {
      file,
      filepath,
    };
  }
};

const scanFiles = async (media: string[], dir: string): Promise<any[]> => {
  const bar = new ProgressBar(":bar [:current/:total] :percent%", {
    total: media.length,
  });

  const result: MediaObject[] = [];
  for await (const m of media) {
    bar.tick();
    const obj = await getMediaObject(dir, m);
    result.push(obj);
  }

  return result;
};

const writeCsv = (records: MediaObject[]): void => {
  const csvWriter = createCsvWriter({
    path: "./output.csv",
    header: [
      { id: "file", title: "FILE" },
      { id: "filepath", title: "PATH" },
      { id: "codec", title: "CODEC" },
      { id: "width", title: "WIDTH" },
      { id: "height", title: "HEIGHT" },
      { id: "duration", title: "DURATION" },
      { id: "aspectRatio", title: "ASPECT RATIO" },
    ],
  });

  csvWriter.writeRecords(records).then(() => console.log("Done."));
};

const writeJson = (records: MediaObject[]): void => {
  fs.writeFile("./output.json", JSON.stringify(records, null, 2), "utf8");
};

const main = async () => {
  try {
    const dir = process.argv[2] || "./";

    const files = await getFiles(dir);
    const media = filterMedia(files);
    console.log(`\tFound ${media.length || 0} media files.`);

    console.log(`Scanning files...`);
    const records = await scanFiles(media, dir);

    console.log('\nWriting results to "output.csv"...');
    writeCsv(records);
    writeJson(records);
  } catch (error) {
    console.error("Media-Scanner encountered an error:\n", error);
  }
};

main();
