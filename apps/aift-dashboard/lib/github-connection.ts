export type GitHubConnectionStatus = {
  configured: boolean;
  app_name: string;
  install_url: string;
  callback_url: string;
  required_env: string[];
};

export function getGitHubConnectionStatus(): GitHubConnectionStatus {
  const appName = process.env.AIFT_GITHUB_APP_NAME || 'AIFT Cloud Connector';
  const installUrl = process.env.AIFT_GITHUB_APP_INSTALL_URL || '';
  const callbackUrl = process.env.AIFT_GITHUB_CALLBACK_URL || '';

  return {
    configured: Boolean(installUrl && callbackUrl),
    app_name: appName,
    install_url: installUrl,
    callback_url: callbackUrl,
    required_env: [
      'AIFT_GITHUB_APP_NAME',
      'AIFT_GITHUB_APP_INSTALL_URL',
      'AIFT_GITHUB_CALLBACK_URL',
      'AIFT_GITHUB_APP_ID',
      'AIFT_GITHUB_CLIENT_ID',
    ],
  };
}
