import { toUTCyyyyMM, toUTCyyyyMMddHHmm } from "./datetime.ts";

export const createPath = (
  area: "ASAS" | "SPAS",
  extension: "png" | "svg" | "svgz",
  date: Date,
): string => {
  let hours = date.getUTCHours();
  const fixedDate = new Date(date);
  if (area === "SPAS") {
    hours = hours - hours % 3;
    if (hours === 15) hours = 12;
  } else {
    hours = hours - hours % 6;
  }
  fixedDate.setUTCHours(hours);
  fixedDate.setUTCMinutes(0);

  return `https://www.data.jma.go.jp/fcd/yoho/data/wxchart/quick/${
    toUTCyyyyMM(fixedDate)
  }/${area}_COLOR_${toUTCyyyyMMddHHmm(fixedDate)}.${
    extension === "svg" ? "svgz" : extension
  }`;
};
