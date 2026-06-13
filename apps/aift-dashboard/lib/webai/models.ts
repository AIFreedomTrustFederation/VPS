export type WebAIModel = {
  id: string;
  label: string;
  runtime: string;
  status: string;
};

export const webAIModels: WebAIModel[] = [
  {
    id: 'aift-context-v0',
    label: 'AIFT Context v0',
    runtime: 'local-context',
    status: 'available',
  },
  {
    id: 'local-open-model',
    label: 'Local open model',
    runtime: 'local-runtime',
    status: 'planned',
  },
  {
    id: 'node-open-model',
    label: 'Node open model',
    runtime: 'node-runtime',
    status: 'planned',
  },
  {
    id: 'network-open-model',
    label: 'Network open model',
    runtime: 'network-runtime',
    status: 'planned',
  },
];

export function getDefaultWebAIModel() {
  return webAIModels[0];
}

export function findWebAIModel(modelId: string | undefined | null) {
  return webAIModels.find((model) => model.id === modelId) ?? getDefaultWebAIModel();
}
