import {
  Response,
  ServerRequest,
} from "https://deno.land/std@0.105.0/http/server.ts";

const jmaArchivedWeatherMapPattern =
  /\/jma\/weather-map\/archives\/(ASAS|SPAS)\/([^.]+)\.(svgz?|png)(?:|[#?].*)$/;
const jmaArchivedWeatherMapShortPattern =
  /\/jma\/weather-map\/archives\/([^.]+)\.(svgz?|png)(?:|[#?].*)$/;
const jmaForecastWeatherMapPattern =
  /\/jma\/weather-map\/forecast\/(ASAS|SPAS)\/(24|48)\.png(?:|[#?].*)$/;
const jmaForecastWeatherMapShortPattern =
  /\/jma\/weather-map\/forecast\/(24|48)\.png(?:|[#?].*)$/;

interface WeatherMapList {
  /** 実況予報図のファイル名のリスト */ now: string[];
  /** 48時間予報図のファイル名 */ ft24: string;
  /** 48時間予報図のファイル名 */ ft48: string;
}
interface WeatherMapListResponse {
  /** 日本周辺域のカラー天気図 */ near: WeatherMapList;
  // deno-lint-ignore camelcase
  /** 日本周辺域のモノクロ天気図 */ near_monochrome: WeatherMapList;
  /** 日本周辺域のカラー天気図 */ asia: WeatherMapList;
  // deno-lint-ignore camelcase
  /** 日本周辺域のモノクロ天気図 */ asia_monochrome: WeatherMapList;
}

export default async (request: ServerRequest) => {
  console.log(`Access to "${request.url}"`);
  if (request.url === "/") {
    const headers = new Headers();
    headers.set("content-type", "text/plain; charset=utf-8");
    return request.respond({
      status: 200,
      body: `Hello, from Deno v${Deno.version.deno}!`,
    });
  }

  if (
    jmaForecastWeatherMapPattern.test(request.url) ||
    jmaForecastWeatherMapShortPattern.test(request.url)
  ) {
    try {
      const res = await routeForecast(request.url);
      request.respond(res);
    } catch (e) {
      if ("status" in e) {
        request.respond(e as Response);
      } else {
        throw e;
      }
    }
    return;
  }

  let matches = request.url.match(jmaArchivedWeatherMapPattern);
  let area = "SPAS";
  let time = "";
  let extension = "svgz";

  if (!matches) {
    matches = request.url.match(jmaArchivedWeatherMapShortPattern);
    if (!matches) {
      return request.respond({
        status: 400,
        body: "unvalid URL pattern",
        headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
      });
    }
    time = matches[1];
    extension = matches[2];
  } else {
    area = matches[1];
    time = matches[2];
    extension = matches[3];
  }

  if (!isArea(area)) {
    return request.respond({
      status: 400,
      body: 'Area must be "ASAS" or "SPAS"',
      headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  }
  if (!isExtension(extension)) {
    return request.respond({
      status: 400,
      body: 'Available extension are "png", "svg" and "svgz"',
      headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  }
  if (time !== "today" && time !== "yesterday" && !/^\d+daysago$/.test(time)) {
    return request.respond({
      status: 400,
      body: 'Available filename are ["today", "yesterday","/^\\d+daysago$/"]',
      headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  }

  const now = new Date();

  if (time === "yesterday") {
    now.setUTCDate(now.getUTCDate() - 1);
  }
  if (/^\d+daysago$/.test(time)) {
    const back = parseInt(time.match(/(\d+)/)?.[1] ?? "0");
    now.setUTCDate(now.getUTCDate() - back);
  }
  let path = "";
  for (let i = 0; i < 3; i++) {
    path = createPath(area, extension, now);
    const res = await fetch(path);
    console.log(`Check "${path}"...${res.ok ? "found" : "not found"}`);
    if (res.ok) break;
    path = "";
    now.setUTCHours(now.getUTCHours() - (area === "ASAS" ? 6 : 3));
  }
  if (path === "") {
    return request.respond({
      status: 404,
      body: "Could not find the latest weather map",
      headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  }

  const headers = new Headers();
  console.log(`Go to "${path}"`);
  headers.set("location", path);
  return request.respond({
    status: 301,
    headers,
  });
};

async function routeForecast(url: string) {
  let matches = url.match(jmaForecastWeatherMapPattern);
  let area = "SPAS";
  let time = 24;

  if (!matches) {
    matches = url.match(jmaForecastWeatherMapShortPattern);
    if (!matches) {
      throw {
        status: 400,
        body: "unvalid URL pattern",
      };
    }
    time = parseInt(matches[1]);
  } else {
    area = matches[1];
    time = parseInt(matches[2]);
  }

  if (!isArea(area)) {
    throw {
      status: 400,
      body: 'Area must be "ASAS" or "SPAS"',
    };
  }
  if (time !== 24 && time !== 48) {
    throw {
      status: 400,
      body: 'Available filename are ["24", "48"]',
    };
  }

  const basename = "https://www.jma.go.jp/bosai/weather_map/data/";
  const res = await fetch(
    `${basename}list.json`,
  );
  if (!res.ok) throw { status: res.status, body: await res.text() };
  const { near, asia } = (await res.json()) as WeatherMapListResponse;
  const path = `${basename}png/${
    area === "SPAS"
      ? time === 24 ? near.ft24 : near.ft48
      : time === 24
      ? asia.ft24
      : asia.ft48
  }`;

  console.log(`Go to "${path}"`);
  const headers = new Headers();
  headers.set("location", path);
  return {
    status: 301,
    headers,
  };
}

function isArea(area: string): area is "ASAS" | "SPAS" {
  return area === "ASAS" || area === "SPAS";
}
function isExtension(area: string): area is "png" | "svg" | "svgz" {
  return area === "png" || area === "svg" || area === "svgz";
}
function zero(value: number) {
  return `${value}`.padStart(2, "0");
}
function toUTCyyyyMM(time: Date) {
  const year = `${time.getUTCFullYear()}`.padStart(4, "0");
  const month = `${time.getUTCMonth() + 1}`.padStart(2, "0");
  return year + month;
}
function toUTCyyyyMMddHHmm(time: Date) {
  const date = `${time.getUTCDate()}`.padStart(2, "0");
  const hours = `${time.getUTCHours()}`.padStart(2, "0");
  const minutes = `${time.getUTCMinutes()}`.padStart(2, "0");
  return toUTCyyyyMM(time) + date + hours + minutes;
}

function createPath(
  area: "ASAS" | "SPAS",
  extension: "png" | "svg" | "svgz",
  date: Date,
) {
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
}
