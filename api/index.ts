import { bold, yellow } from "../deps/color.ts";
import { Application, Router, Status } from "../deps/oak.ts";
import { handleErrors } from "../src/handleErrors.ts";
import { handleNotFound } from "../src/handleNotFound.ts";
import { datetime, fetchList } from "../src/list.ts";
import { logging } from "../src/logging.ts";
import { timing } from "../src/timing.ts";
import { Area, Extension, makeArchivedWeatherMapURL } from "../src/url.ts";

const router = new Router();
router.get("/", (context) => {
  context.response.status = Status.OK;
  context.response.type = "text";
  context.response.body = `Hello, from Deno v${Deno.version.deno}!`;
})
  .get<
    {
      area?: Area;
      time: "24" | "48";
      extension: Extension;
    }
  >(
    "/jma/weather-map/forecast/:area(ASAS|SPAS)?/:time(24|48).png",
    async (context) => {
      const area = context.params.area ?? "SPAS";
      const time = context.params.time;
      const { near, asia } = await fetchList();

      const path = `https://www.jma.go.jp/bosai/weather_map/data/png/${
        area === "SPAS"
          ? time === "24" ? near.ft24[0] : near.ft48[0]
          : time === "24"
          ? asia.ft24[0]
          : asia.ft48[0]
      }`;
      if (!path) throw new Error("Could not find an exact url");

      context.response.headers.set("location", path);
      context.response.status = Status.MovedPermanently;
    },
  )
  // APIから見つける
  .get<
    {
      area?: Area;
      extension: Extension;
    }
  >(
    "/jma/weather-map/archives/:area(ASAS|SPAS)?/today.:extension(png|svg|svgz|pdf)",
    async (context) => {
      const area = context.params.area ?? "SPAS";
      const { near, asia } = await fetchList();
      const date = datetime(
        area === "SPAS"
          ? near.now[near.now.length - 1]
          : asia.now[asia.now.length - 1],
      );
      if (!date) throw new Error("Failed to parse date from url.");
      const path = makeArchivedWeatherMapURL(
        date,
        area,
        "COLOR",
        context.params.extension,
      );
      if (!path) throw Error("Could not find an exact url");

      context.response.headers.set("location", path);
      context.response.status = Status.MovedPermanently;
    },
  )
  // 手当たり次第fetchして見つける
  .get<
    {
      area?: Area;
      day: string;
      extension: Extension;
    }
  >(
    "/jma/weather-map/archives/:area(ASAS|SPAS)?/:day(yesterday|\\d+daysago).:extension(png|svg|svgz|pdf)",
    async (context) => {
      const area = context.params.area ?? "SPAS";
      const day = context.params.day;
      const now = new Date();

      if (day === "yesterday") {
        now.setUTCDate(now.getUTCDate() - 1);
      }
      if (/^\d+daysago$/.test(day)) {
        const back = parseInt(day.match(/(\d+)/)?.[1] ?? "0");
        now.setUTCDate(now.getUTCDate() - back);
      }
      let path = "";
      for (let i = 0; i < 3; i++) {
        path = makeArchivedWeatherMapURL(
          now,
          area,
          "COLOR",
          context.params.extension,
        );
        const res = await fetch(path);
        console.log(`Check "${path}"...${res.ok ? "found" : "not found"}`);
        if (res.ok) break;
        path = "";
        now.setUTCHours(now.getUTCHours() - (area === "ASAS" ? 6 : 3));
      }
      if (path === "") {
        context.response.status = Status.NotFound;
        context.response.body = "Could not find the latest weather map";
        context.response.type = "text";
        return;
      }
      context.response.headers.set("location", path);
      context.response.status = Status.MovedPermanently;
    },
  );

const app = new Application();
app.use(logging);
app.use(timing);
app.use(handleErrors);
app.use(async (ctx, next) => {
  await next();
  ctx.response.headers.set("Cache-Control", "max-age=60");
});
app.use(router.routes());
app.use(router.allowedMethods());
app.use(handleNotFound);

app.addEventListener("listen", ({ hostname, port, serverType }) => {
  console.log(`${bold("Start listening on ")}${yellow(`${hostname}:${port}`)}`);
  console.log(`${bold("  using HTTP server: ")}${yellow(serverType)}`);
});

export default app.handle;
