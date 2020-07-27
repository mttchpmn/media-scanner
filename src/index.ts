#! /usr/bin/env node

const ffprobe = require("ffprobe");
const ffprobeStatic = require("ffprobe-static");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

import * as path from "path";
import { promises as fs } from "fs";

type MediaObject = {
  file: string;
  filepath: string;
  codec: string;
  width: string;
  height: string;
  duration: string;
  aspectRatio: string;
};

const getFiles = async (dir: string): Promise<string[]> => {
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

  const { streams } = await ffprobe(filepath, { path: ffprobeStatic.path });
  const data = streams[0];

  const {
    codec_name: codec,
    width,
    height,
    duration,
    display_aspect_ratio: aspectRatio,
  } = data;

  return {
    file,
    filepath,
    codec,
    width,
    height,
    duration,
    aspectRatio,
  };
};

const scanFiles = async (media: string[], dir: string): Promise<any[]> => {
  const result = await Promise.all(media.map((f) => getMediaObject(dir, f)));

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

const main = async () => {
  const dir = process.argv[2];
  console.log("Scanning dir: ", dir);

  const files = await getFiles(dir);
  const media = filterMedia(files);
  console.log("\nFound media:");
  media.forEach((f) => console.log("\t", f));

  const records = await scanFiles(media, dir);

  console.log('\nWriting results to "output.csv"...');
  writeCsv(records);
};

main();
