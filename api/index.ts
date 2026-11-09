import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TikTokResponse {
  title: string;
  video: string | null;
  music: string | null;
  images: string[];
  live: string[];
  items: Array<{ type: 'img' | 'vid'; url: string }>;
  isStory: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Benarkan CORS untuk domain anda
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = (req.query.url as string) || (req.body?.url as string);

  if (!url || !url.includes('tiktok.com')) {
    return res.status(400).json({ error: 'Sila masukkan link TikTok yang sah.' });
  }

  try {
    // Panggil TikWM API
    const tikwmRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      },
    });

    const json = await tikwmRes.json();
    if (json.code !== 0 || !json.data) {
      throw new Error(json.msg || 'Gagal memproses link TikTok');
    }

    const d = json.data;
    const images: string[] = d.images || [];
    const rawLive: string[] = d.live_images || [];

    const items: Array<{ type: 'img' | 'vid'; url: string }> = [];
    if (images.length && rawLive.length === images.length) {
      images.forEach((img, idx) => {
        const live = rawLive[idx];
        items.push(live ? { type: 'vid', url: live } : { type: 'img', url: img });
      });
    }

    const payload: TikTokResponse = {
      title: d.title || 'TikTok Media',
      video: images.length ? null : (d.hdplay || d.play || null),
      music: d.music || null,
      images: images,
      live: rawLive.filter(Boolean),
      items: items,
      isStory: Boolean(d.is_story),
    };

    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Ralat pelayan.' });
  }
}
