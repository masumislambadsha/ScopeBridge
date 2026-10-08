import { startWorkers } from './processors';

startWorkers();

// keep process alive; BullMQ workers hold connections open
setInterval(() => {}, 1 << 30);
