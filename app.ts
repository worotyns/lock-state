import { Router } from "./deps.ts";
import { html } from "./deps.ts";
import { Application } from "./deps.ts";
import { LockStateAppService } from "./lockstate.ts";
const app = new Application();
const router = new Router();

const log = (...args: string[]) => console.log(['[', new Date().toISOString(), ']: ', ...args].join(''));
const kv = await Deno.openKv();
const lockStateAppService = new LockStateAppService(kv);

router.post('/locks', async (ctx) => {
    const lock = await lockStateAppService.createNew()
    ctx.response.status = 200;
    ctx.response.headers.append('Content-Type', 'application/json');
    ctx.response.body = JSON.stringify({
        lockId: lock.getId(),
        lockKey: lock.getKey(),
        isLocked: lock.isLocked(),
    });
})

router.get('/locks/:lockId', async (ctx) => {
    const isLocked = await lockStateAppService.isLocked(ctx.params.lockId);
    ctx.response.status = isLocked ? 423 : 204;
})

router.patch('/locks/:lockId/lock', async (ctx) => {
    const expireTime = ~~(ctx.request.url.searchParams.get('e') || -1);
    const key = ctx.request.url.searchParams.get('k') || '';
    await lockStateAppService.lockByIdAndKey(ctx.params.lockId, key, expireTime);
    ctx.response.status = 204;
})

router.patch('/locks/:lockId/unlock', async (ctx) => {
    const key = ctx.request.url.searchParams.get('k') || '';
    await lockStateAppService.unlock(ctx.params.lockId, key);
    ctx.response.status = 204;
})

router.patch('/locks/:lockId/toggle', async (ctx) => {
    const key = ctx.request.url.searchParams.get('k') || '';
    await lockStateAppService.toggle(ctx.params.lockId, key);
    ctx.response.status = 204;
})

router.get('/', ctx => {
    ctx.response.status = 200;
    ctx.response.body = html`
    # Create new lock
    curl -X POST https://lock-states.deno.dev/locks                          
    {"lockId":"01hvkab4t422rap18rwjs2prnm","lockKey":"b749f750-fbe3-11ee-9224-d7fd2399170d","isLocked":false}

    # If unlocked return 204
    curl -X GET https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm -I
    HTTP/2 204 

    # Lock state with k=string param and ttl with e=600 (auto unlock)
    curl -X PATCH "https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm\lock?k=b749f750-fbe3-11ee-9224-d7fd2399170d"

    # If locked return 423
    curl -X GET https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm -I
    HTTP/2 423 

    # Using in github actions to stop pipeline if locked
    curl -X GET https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm -f && echo "there is no lock"
    curl: (22) The requested URL returned error: 423

    # Want to have own deployment? Here you have source code: https://github.com/worotyns/lock-state
    `
})

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.response.headers.set("Content-Type", "text/plain");
    ctx.response.status = 500;
    ctx.response.body = error.message;
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

export {
    app
}