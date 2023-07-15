import { toUTCyyyyMM, toUTCyyyyMMddHHmm } from "./datetime.ts";

export type Area = "ASAS" | "SPAS";
export type Extension = "png" | "svg" | "svgz" | "pdf";

/** 過去の天気図と同じ形式のURLを生成する */
export const makeArchivedWeatherMapURL = (
  date: Date,
  area: Area,
  color: "COLOR" | "MONO",
  extension: Extension,
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
  }/${area}_${color}_${toUTCyyyyMMddHHmm(fixedDate)}.${
    extension === "svg" ? "svgz" : extension
  }`;
};
