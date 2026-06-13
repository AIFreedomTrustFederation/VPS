import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getDockerStatus() {
  try {
    const { stdout } = await execFileAsync('docker', ['info', '--format', '{{json .ServerVersion}}'], { timeout: 5000 });
    return { online: true, version: stdout.trim().replaceAll('"', '') };
  } catch {
    return { online: false, version: null };
  }
}

export async function collectSystemReport() {
  const docker = await getDockerStatus();
  const totalMemoryGb = os.totalmem() / 1024 / 1024 / 1024;
  const freeMemoryGb = os.freemem() / 1024 / 1024 / 1024;
  const usedMemoryPercent = Math.round(((totalMemoryGb - freeMemoryGb) / totalMemoryGb) * 100);

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu_cores: os.cpus().length,
    load_average: os.loadavg(),
    memory_total_gb: Number(totalMemoryGb.toFixed(2)),
    memory_free_gb: Number(freeMemoryGb.toFixed(2)),
    memory_used_percent: usedMemoryPercent,
    uptime_seconds: os.uptime(),
    docker
  };
}
