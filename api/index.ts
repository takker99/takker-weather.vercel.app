import { ServerRequest } from "https://deno.land/std@0.105.0/http/server.ts";

const jmaArchivedWeatherMapPattern =
  /\/jma\/weather-map\/archives\/(ASAS|SPAS)\/([^.]+)\.(svgz?|png)(?:|[#?].*)$/;
const jmaArchivedWeatherMapShortPattern =
  /\/jma\/weather-map\/archives\/([^.]+)\.(svgz?|png)(?:|[#?].*)$/;

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
  if (time !== "today") {
    return request.respond({
      status: 400,
      body: 'Available filename is only "today"',
      headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  }

  const now = new Date();
  let path = "";
  for (let i = 0; i < 3; i++) {
    path = createPath(area, extension, now);
    const res = await fetch(path);
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
  let hours = date.getUTCHours() + 9;
  const fixedDate = new Date(date);
  if (area === "SPAS") {
    if (0 <= hours && hours < 3) {
      fixedDate.setUTCDate(fixedDate.getUTCDate() - 1);
      hours = 21;
    } else {
      for (let i = 1; i < 8; i++) {
        if (i * 3 <= hours && hours < (i + 1) * 3) {
          hours = i * 3;
        }
      }
    }
  } else {
    if (0 <= hours && hours < 3) {
      fixedDate.setUTCDate(fixedDate.getUTCDate() - 1);
      hours = 21;
    } else {
      for (let i = 0; i < 4; i++) {
        if (3 + i * 6 <= hours && hours < 3 + (i + 1) * 6) {
          hours = i * 6 + 3;
        }
      }
    }
  }
  fixedDate.setUTCHours(hours - 9);
  fixedDate.setUTCMinutes(0);

  if (fixedDate.getUTCHours() + 9 === 24) {
    fixedDate.setUTCHours(fixedDate.getUTCHours() - (area === "ASAS" ? 6 : 3));
  }

  return `https://www.data.jma.go.jp/fcd/yoho/data/wxchart/quick/${
    toUTCyyyyMM(fixedDate)
  }/${area}_COLOR_${toUTCyyyyMMddHHmm(fixedDate)}.${
    extension === "svg" ? "svgz" : extension
  }`;
}
