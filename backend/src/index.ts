import http from 'http';
import { buildApp } from './app';
import { env } from './config/env';
import { initSocket } from './lib/socket';

const app = buildApp();
const server = http.createServer(app);
initSocket(server);

server.listen(env.PORT, () => {
  console.log(`[api] listening on :${env.PORT} (${env.NODE_ENV})`);
});
