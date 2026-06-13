export type AftServiceRecord = {
  id: string;
  name: string;
  label: string;
  route: string;
  port: number;
  healthPath: string;
  status: 'active' | 'pending' | 'disabled';
  description: string;
};

const servicePort = Number(process.env.APP_PORT || process.env.PORT || 3000);
const baseUrl = process.env.AIFT_PUBLIC_BASE_URL || 'http://127.0.0.1:' + servicePort;

const services: AftServiceRecord[] = [
  { id: 'dashboard', name: 'dashboard.aft', label: 'Dashboard', route: '/', port: servicePort, healthPath: '/health', status: 'active', description: 'AFT Cloud command center.' },
  { id: 'domains', name: 'domains.aft', label: 'Domains', route: '/domains', port: servicePort, healthPath: '/health', status: 'active', description: 'Domain reservation and owner control panel.' },
  { id: 'sites', name: 'sites.aft', label: 'Sites', route: '/sites', port: servicePort, healthPath: '/health', status: 'active', description: 'Native AFT website registry and deployments.' },
  { id: 'dns', name: 'dns.aft', label: 'DNS', route: '/dns', port: servicePort, healthPath: '/health', status: 'active', description: 'DNS and AFT resolver record management.' },
  { id: 'deployments', name: 'deployments.aft', label: 'Deployments', route: '/deployments', port: servicePort, healthPath: '/health', status: 'active', description: 'Deployment timeline and health status.' },
  { id: 'nodes', name: 'nodes.aft', label: 'Nodes', route: '/nodes', port: servicePort, healthPath: '/health', status: 'active', description: 'Decentralized VPS node registry.' },
  { id: 'readiness', name: 'readiness.aft', label: 'Readiness', route: '/readiness', port: servicePort, healthPath: '/health', status: 'active', description: 'Production readiness checklist.' },
  { id: 'registry', name: 'registry.aft', label: 'Registry', route: '/registry', port: servicePort, healthPath: '/health', status: 'active', description: 'AFT namespace governance.' },
  { id: 'webai', name: 'webai.aft', label: 'WebAI', route: '/webai', port: servicePort, healthPath: '/health', status: 'active', description: 'WebAI builder workflow.' },
  { id: 'health', name: 'health.aft', label: 'Health', route: '/health', port: servicePort, healthPath: '/health', status: 'active', description: 'Node health status.' }
];

export function listAftServices() {
  return services;
}

export function getAftService(service: string) {
  const normalized = service.toLowerCase().trim().replace('.aft', '');
  return services.find((record) => record.id === normalized || record.name === normalized + '.aft') || null;
}

export function browserSafeServiceUrl(record: AftServiceRecord) {
  return baseUrl.replace(/\/$/, '') + record.route;
}

export function localAftGatewayUrl(record: AftServiceRecord) {
  return baseUrl.replace(/\/$/, '') + '/aft/' + record.id;
}

export function httpsAftUrl(record: AftServiceRecord) {
  return 'https://' + record.name;
}
