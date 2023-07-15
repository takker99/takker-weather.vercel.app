import { serve } from "./deps/server.ts";
import handle from "./api/index.ts";

await serve(async (req) => {
  return (await handle(req))!;
}, { port: 8080 });
