import { NextRequest, NextResponse } from 'next/server';

interface MediaItem {
  type: 'img' | 'vid';
  url: string;
  index: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url || !url.includes('tiktok.com')) {
    return NextResponse.json({ error: 'Sila masukkan pautan TikTok yang sah.' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      },
      cache: 'no-store'
    });

    const json = await res.json();
    if (json.code !== 0 || !json.data) {
      return NextResponse.json({ error: json.msg || 'Gagal mengambil data daripada TikTok.' }, { status: 400 });
    }

    const d = json.data;
    const imgs: string[] = d.images || [];
    const rawLive: (string | null)[] = d.live_images || [];

    // Susun item campuran (mixed) mengikut turutan asal
    const items: MediaItem[] = [];
    if (imgs.length && rawLive.length === imgs.length) {
      imgs.forEach((im, idx) => {
        const lv = rawLive[idx];
        if (lv) {
          items.push({ type: 'vid', url: lv, index: idx + 1 });
        } else {
          items.push({ type: 'img', url: im, index: idx + 1 });
        }
      });
    }

    const liveClips: string[] = rawLive.filter((x): x is string => Boolean(x));
    const hasImg = items.some((i) => i.type === 'img');
    const hasVid = items.some((i) => i.type === 'vid');
    const isStory = Boolean(d.is_story) || url.includes('/story');

    // Pengesanan jenis (mirip detect() Python)
    let kind = 'video';
    if (isStory) {
      kind = liveClips.length ? 'photolivestory' : 'story';
    } else if (hasImg && hasVid) {
      kind = 'mixed';
    } else if (liveClips.length > 0) {
      kind = liveClips.length > 1 ? 'photoliveslide' : 'photolive';
    } else if (imgs.length > 0) {
      kind = imgs.length === 1 ? 'photo' : 'slidephoto';
    }

    return NextResponse.json({
      kind,
      title: d.title || 'TikTok Media',
      author: {
        nickname: d.author?.nickname || 'TikTok User',
        unique_id: d.author?.unique_id || '',
        avatar: d.author?.avatar || '',
      },
      video: imgs.length ? null : (d.hdplay || d.play || null),
      music: d.music || null,
      music_info: d.music_info || null,
      images: imgs,
      live: liveClips,
      items: items,
      stats: {
        images_count: imgs.length,
        live_count: liveClips.length,
        total_items: items.length || (imgs.length + liveClips.length)
      },
      is_story: isStory
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Ralat pelayan.' }, { status: 500 });
  }
}
