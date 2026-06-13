import { getDeploymentByApp } from './deployments';
import { readNodes } from './nodes';

export async function getDisclosure(app: string) {
  const deployment = await getDeploymentByApp(app);
  const nodes = await readNodes();
  const node = deployment ? nodes.find((item) => item.name === deployment.node) : null;

  if (!deployment) {
    return null;
  }

  return {
    app: deployment.app,
    domain: deployment.domain,
    status: deployment.status,
    deployed_at: deployment.deployed_at,
    node: deployment.node,
    operator: node?.operator || 'Unknown operator',
    operator_class: node?.operator_class || 'unknown',
    trust_level: node?.trust_level || 'unknown',
    region: node?.region || 'unknown',
    disclosure_required: deployment.disclosure_required,
    statement: node?.operator_class === 'verified-community'
      ? 'This app is running on an independently operated verified community node. Only workloads matching this trust class should run here.'
      : node?.operator_class === 'self-hosted'
        ? 'This app is running on a self-hosted node controlled by the app owner or builder.'
        : 'This app is running on a managed AIFT node operated or controlled by AI Freedom Trust Federation.'
  };
}
