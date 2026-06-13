import { config } from './config.js';
import { sendHeartbeat } from './heartbeat.js';

async function main() {
  console.log(`[AIFT Node Agent] starting ${config.nodeName}`);

  await sendHeartbeat().catch((error) => {
    console.error('[AIFT Node Agent] first heartbeat failed:', error.message);
  });

  setInterval(() => {
    sendHeartbeat().catch((error) => {
      console.error('[AIFT Node Agent] heartbeat failed:', error.message);
    });
  }, config.heartbeatIntervalMs);
}

main().catch((error) => {
  console.error('[AIFT Node Agent] fatal:', error);
  process.exit(1);
});
