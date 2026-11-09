'use client';
import React, { useState } from 'react';

export default function TikTokPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setErr('');
    setData(null);

    try {
      const res = await fetch(`/api/tiktok?url=${encodeURIComponent(url.trim())}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal memproses link.');
      setData(result);
    } catch (e: any) {
      setErr(e.message || 'Ralat berlaku.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '0.5rem' }}>TikTok Media Extractor</h1>
      <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '1.5rem' }}>Download Video Tanpa Watermark, Slideshow, & MP3</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Tampal link TikTok di sini..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '1rem', outline: 'none' }}
        />
        <button
          onClick={handleFetch}
          disabled={loading}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Memproses...' : 'Dapatkan'}
        </button>
      </div>

      {err && (
        <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
          ⚠️ {err}
        </div>
      )}

      {data && (
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #334155' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', wordBreak: 'break-word' }}>{data.title}</h3>

          {data.video && (
            <div style={{ marginBottom: '1.5rem' }}>
              <video src={data.video} controls style={{ width: '100%', borderRadius: '8px', maxHeight: '450px', background: '#000' }} />
              <div style={{ marginTop: '0.5rem' }}>
                <a href={data.video} target="_blank" download="tiktok.mp4" style={{ display: 'inline-block', background: '#10b981', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
                  ⬇️ Muat Turun Video HD
                </a>
              </div>
            </div>
          )}

          {data.images && data.images.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Foto / Slideshow ({data.images.length})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {data.images.map((img: string, i: number) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={img} alt={`slide-${i}`} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }} />
                    <a href={img} target="_blank" download={`slide_${i + 1}.jpg`} style={{ display: 'block', textAlign: 'center', background: '#0284c7', color: '#fff', fontSize: '0.8rem', padding: '4px 0', borderRadius: '4px', marginTop: '4px', textDecoration: 'none' }}>
                      Simpan #{i + 1}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.live && data.live.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Live Photo Clips ({data.live.length})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {data.live.map((clip: string, i: number) => (
                  <div key={i}>
                    <video src={clip} controls style={{ width: '100%', height: '150px', borderRadius: '6px', background: '#000' }} />
                    <a href={clip} target="_blank" download={`live_${i + 1}.mp4`} style={{ display: 'block', textAlign: 'center', background: '#6366f1', color: '#fff', fontSize: '0.8rem', padding: '4px 0', borderRadius: '4px', marginTop: '4px', textDecoration: 'none' }}>
                      Klip #{i + 1}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.music && (
            <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
              <h4>Trek Audio TikTok</h4>
              <audio src={data.music} controls style={{ width: '100%', marginBottom: '0.5rem' }} />
              <br />
              <a href={data.music} target="_blank" download="audio.mp3" style={{ display: 'inline-block', background: '#8b5cf6', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
                🎵 Muat Turun MP3
              </a>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
