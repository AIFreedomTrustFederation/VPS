import { NextRequest, NextResponse } from 'next/server';
import { readEngineRecords } from '@/lib/engine-records';
import { createAppLink } from '@/lib/app-link-records';

type AppLinkRecord = {
  id: string;
  profile_id?: string;
  source_id?: string;
  repo?: string;
  status?: string;
  href?: string;
};

export async function GET() {
  const records = readEngineRecords<AppLinkRecord>('workloads').filter((item) => item.href && item.status === 'link-ready');
  return NextResponse.json({ ok: true, links: records });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const profileId = typeof body.profileId === 'string' ? body.profileId : '';

  if (!profileId) {
    return NextResponse.json({ ok: false, error: 'Profile id is required.' }, { status: 400 });
  }

  try {
    const result = createAppLink(profileId);
    return NextResponse.json({ ok: true, profile: result.profile, link: result.link });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'App link failed.' }, { status: 400 });
  }
}
