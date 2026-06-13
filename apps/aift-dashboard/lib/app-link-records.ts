import { readEngineRecords, upsertEngineRecord } from './engine-records';

type AppProfile = {
  id: string;
  source_id: string;
  repo: string;
  framework: string;
  package_manager: string;
  install_command: string;
  build_command: string;
  dev_command: string;
  verify_command: string;
};

function stamp() {
  return new Date().toISOString();
}

export function createAppLink(profileId: string) {
  const profiles = readEngineRecords<AppProfile>('app-profiles');
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) throw new Error('Profile not found.');

  const id = `app-${profile.source_id}-${Date.now()}`;
  const record = {
    id,
    profile_id: profile.id,
    source_id: profile.source_id,
    repo: profile.repo,
    status: 'link-ready',
    framework: profile.framework,
    package_manager: profile.package_manager,
    install_command: profile.install_command,
    build_command: profile.build_command,
    dev_command: profile.dev_command,
    verify_command: profile.verify_command,
    href: `/app-links/${id}`,
    created_at: stamp(),
    updated_at: stamp(),
  };

  upsertEngineRecord('workloads', record);
  return { profile, link: record };
}
