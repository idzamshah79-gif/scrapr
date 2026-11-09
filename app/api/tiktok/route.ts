import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url || !url.includes('tiktok.com')) {
    return NextResponse.json({ error: 'Sila masukkan link TikTok yang sah.' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      },
      next: { revalidate: 0 }
    });

    const json = await res.json();
    if (json.code !== 0 || !json.data) {
      return NextResponse.json({ error: json.msg || 'Gagal mengambil data TikTok' }, { status: 400 });
    }

    const d = json.data;
    const images: string[] = d.images || [];
    const rawLive: string[] = d.live_images || [];

    return NextResponse.json({
      title: d.title || 'TikTok Media',
      video: images.length ? null : (d.hdplay || d.play || null),
      music: d.music || null,
      images: images,
      live: rawLive.filter(Boolean),
      isStory: Boolean(d.is_story),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Ralat pelayan.' }, { status: 500 });
  }
}
