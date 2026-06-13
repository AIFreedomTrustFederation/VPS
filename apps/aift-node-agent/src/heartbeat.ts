import { config } from './config.js';
import { collectSystemReport } from './system.js';

export async function sendHeartbeat() {
  const report = await collectSystemReport();
  const payload = {
    node: config.nodeName,
    status: 'online',
    timestamp: new Date().toISOString(),
    report
  };

  if (!config.controlPlaneUrl || !config.nodeToken) {
    console.log(JSON.stringify({ type: 'heartbeat:local', payload }, null, 2));
    return payload;
  }

  const response = await fetch(new URL('/api/nodes/heartbeat', config.controlPlaneUrl), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.nodeToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Heartbeat failed: ${response.status} ${body}`);
  }

  return payload;
}
