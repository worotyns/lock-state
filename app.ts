import { html, Router, rustyMarkdown } from "./deps.ts";
import { Application } from "./deps.ts";
import { NotFoundError } from "./lockstate.ts";
import { LockStateAppService, UnauthorizedError } from "./lockstate.ts";

const app = new Application();
const router = new Router();
const markdown = Deno.readTextFileSync("./README.md");
const tokenized = rustyMarkdown.tokens(markdown, { strikethrough: true });
const rendered = rustyMarkdown.html(tokenized);

const website = html`
<!DOCTYPE html>
<html>
  <head>
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css"
  />
  </head>
  <body>
    <main>
      ${rendered}
    </main>
  </body>
</html>
`;

const log = (...args: string[]) =>
  console.log(["[", new Date().toISOString(), "]: ", ...args].join(""));
const kv = await Deno.openKv();
const lockStateAppService = new LockStateAppService(kv);

router.post("/locks", async (ctx) => {
  const lock = await lockStateAppService.createNew();
  ctx.response.status = 200;
  ctx.response.headers.append("Content-Type", "application/json");
  ctx.response.body = JSON.stringify({
    lockId: lock.getId(),
    lockKey: lock.getKey()
  });
});

router.get("/locks/:lockId", async (ctx) => {
  const isLocked = await lockStateAppService.isLocked(ctx.params.lockId);
  ctx.response.status = isLocked ? 423 : 204;
});

router.patch("/locks/:lockId/lock", async (ctx) => {
  const expireTime = ~~(ctx.request.url.searchParams.get("e") || -1);
  const key = ctx.request.url.searchParams.get("k") || "";
  await lockStateAppService.lockByIdAndKey(ctx.params.lockId, key, expireTime);
  ctx.response.status = 204;
});

router.patch("/locks/:lockId/unlock", async (ctx) => {
  const key = ctx.request.url.searchParams.get("k") || "";
  await lockStateAppService.unlock(ctx.params.lockId, key);
  ctx.response.status = 204;
});

router.get("/", (ctx) => {
  ctx.response.status = 200;
  ctx.response.headers.append("content-type", "text/html");
  ctx.response.body = website;
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.response.body = error.message;
    if (error instanceof UnauthorizedError) {
      ctx.response.status = 401;
    } else if (error instanceof NotFoundError) {
      ctx.response.status = 404;
    } else {
      ctx.response.status = 500;
      ctx.response.body = "Internal server error";
    }
  }
});

app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use((ctx) => {
  ctx.response.status = 404;
  ctx.response.body = "not found";
});

export { app };
