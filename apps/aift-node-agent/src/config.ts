export const config = {
  nodeName: process.env.AIFT_NODE_NAME || 'unregistered-node',
  controlPlaneUrl: process.env.AIFT_CONTROL_PLANE_URL || '',
  nodeToken: process.env.AIFT_NODE_TOKEN || '',
  heartbeatIntervalMs: Number(process.env.AIFT_HEARTBEAT_INTERVAL_MS || 30000),
  registryPath: process.env.AIFT_NODE_CONFIG || '/opt/aift/node-agent/aift.node.yml'
};
