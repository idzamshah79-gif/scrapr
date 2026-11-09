'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function TikTokDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');

  // Status proses & animasi kelajuan
  const [statusText, setStatusText] = useState('');
  const [speed, setSpeed] = useState('0.0 KB/s');
  const [transferred, setTransferred] = useState('0.0 MB');
  const [ping, setPing] = useState(0);

  // Slideshow Player State (1.5 saat per gambar)
  const [slideIdx, setSlideIdx] = useState(0);
  const [isPlayingSlide, setIsPlayingSlide] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingSlide && data?.images?.length > 1) {
      timer = setInterval(() => {
        setSlideIdx((prev) => (prev + 1) % data.images.length);
      }, 1500); // 1.5 saat seperti di .env Python
    }
    return () => clearInterval(timer);
  }, [isPlayingSlide, data]);

  const startExtraction = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setErr('');
    setData(null);
    setSlideIdx(0);
    setIsPlayingSlide(false);

    const t0 = performance.now();
    setStatusText('Menyambung ke pelayan CDN...');
    
    // Simulasi telemetri kelajuan masa nyata
    const speedInterval = setInterval(() => {
      const kbps = (Math.random() * 850 + 450).toFixed(1);
      const mb = (Math.random() * 2.8 + 1.2).toFixed(2);
      setSpeed(`${kbps} KB/s`);
      setTransferred(`${mb} MB`);
    }, 180);

    try {
      setStatusText('Mengekstrak data video, audio & slide photo...');
      const res = await fetch(`/api/tiktok?url=${encodeURIComponent(url.trim())}`);
      const t1 = performance.now();
      setPing(Math.round(t1 - t0));

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal memproses pautan.');
      setData(result);
      setStatusText('Pengekstrakan selesai!');
    } catch (e: any) {
      setErr(e.message || 'Ralat berlaku.');
    } finally {
      clearInterval(speedInterval);
      setLoading(false);
    }
  };

  const toggleSlideShow = () => {
    if (!audioRef.current) return;
    if (isPlayingSlide) {
      audioRef.current.pause();
      setIsPlayingSlide(false);
    } else {
      audioRef.current.play();
      setIsPlayingSlide(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #00f2fe, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TikTok Multi-Media Engine
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Video HD • 1.5s Slide Sync • Live Photo Clips • Audio MP3 • Mixed Order
          </p>
        </header>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '0.6rem', background: '#131b2e', padding: '0.5rem', borderRadius: '12px', border: '1px solid #1e293b', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Tampal link TikTok (cth: https://vt.tiktok.com/...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: 1, padding: '0.8rem 1rem', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
          />
          <button
            onClick={startExtraction}
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', padding: '0.8rem 1.6rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
          >
            {loading ? 'Memproses...' : 'Ekstrak'}
          </button>
        </div>

        {/* Real-time Telemetry Panel */}
        {loading && (
          <div style={{ background: '#131b2e', border: '1px solid #2563eb33', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              <span>Status: <b style={{ color: '#38bdf8' }}>{statusText}</b></span>
              <span>Kelajuan: <b style={{ color: '#4ade80' }}>{speed}</b></span>
              <span>Muatan: <b style={{ color: '#facc15' }}>{transferred}</b></span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: '80%', height: '100%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: '3px', animation: 'pulse 1.2s infinite' }}></div>
            </div>
          </div>
        )}

        {err && (
          <div style={{ background: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
            ⚠️ {err}
          </div>
        )}

        {/* Media Results Output */}
        {data && (
          <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '14px', padding: '1.5rem' }}>
            
            {/* Meta Info Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem', marginBottom: '1.2rem' }}>
              <div>
                <span style={{ background: '#2563eb22', color: '#60a5fa', border: '1px solid #2563eb44', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {data.kind}
                </span>
                {data.is_story && (
                  <span style={{ marginLeft: '6px', background: '#ec489922', color: '#f472b6', border: '1px solid #ec489944', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    TikTok Story
                  </span>
                )}
                <h2 style={{ fontSize: '1.1rem', margin: '0.6rem 0 0.2rem 0', color: '#f8fafc' }}>{data.title}</h2>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Pengarang: @{data.author.unique_id} ({data.author.nickname})</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Latensi: <span style={{ color: '#38bdf8' }}>{ping} ms</span>
              </div>
            </div>

            {/* 1. Format Video Biasa */}
            {data.video && (
              <div style={{ marginBottom: '2rem' }}>
                <video src={data.video} controls style={{ width: '100%', borderRadius: '10px', maxHeight: '480px', background: '#000' }} />
                <div style={{ marginTop: '0.8rem' }}>
                  <a href={data.video} target="_blank" download="tiktok_hd.mp4" style={{ display: 'inline-block', background: '#059669', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem' }}>
                    ⬇️ Muat Turun Video HD (Tanpa Watermark)
                  </a>
                </div>
              </div>
            )}

            {/* 2. Slide Photo (Sinkronisasi Audio + Gambar 1.5 Saat) */}
            {data.images && data.images.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>
                    Slideshow Player ({data.images.length} Foto)
                  </h3>
                  {data.music && (
                    <button onClick={toggleSlideShow} style={{ background: isPlayingSlide ? '#e11d48' : '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>
                      {isPlayingSlide ? '⏸ Berhenti Playback' : '▶️ Mainkan Slide (1.5s/foto)'}
                    </button>
                  )}
                </div>

                {/* Live Preview Sync Box */}
                <div style={{ position: 'relative', width: '100%', height: '360px', background: '#0b0f19', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1e293b' }}>
                  <img src={data.images[slideIdx]} alt="preview slide" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  <div style={{ position: 'absolute', bottom: '10px', right: '12px', background: '#000000aa', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#fff' }}>
                    {slideIdx + 1} / {data.images.length}
                  </div>
                </div>

                {/* Grid Galeri Semua Foto */}
                <h4 style={{ margin: '1.2rem 0 0.6rem 0', fontSize: '0.9rem', color: '#94a3b8' }}>Semua Foto Resolusi Penuh:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem' }}>
                  {data.images.map((img: string, i: number) => (
                    <div key={i} style={{ background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      <img src={img} alt={`slide-${i}`} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }} />
                      <a href={img} target="_blank" download={`slide_${i + 1}.jpg`} style={{ display: 'block', textAlign: 'center', background: '#1e293b', color: '#38bdf8', fontSize: '0.75rem', padding: '4px 0', borderRadius: '4px', marginTop: '4px', textDecoration: 'none' }}>
                        Simpan #{i + 1}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Klip Live Photo */}
            {data.live && data.live.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem' }}>
                  Klip Live Photo Video ({data.live.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.8rem' }}>
                  {data.live.map((clip: string, i: number) => (
                    <div key={i} style={{ background: '#0f172a', padding: '6px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      <video src={clip} controls style={{ width: '100%', height: '180px', borderRadius: '6px', background: '#000' }} />
                      <a href={clip} target="_blank" download={`live_${i + 1}.mp4`} style={{ display: 'block', textAlign: 'center', background: '#4338ca', color: '#fff', fontSize: '0.75rem', padding: '5px 0', borderRadius: '4px', marginTop: '6px', textDecoration: 'none' }}>
                        Muat Turun Klip #{i + 1}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Format Campuran (Special Mixed: Foto + Live Klip mengikut urutan) */}
            {data.kind === 'mixed' && data.items?.length > 0 && (
              <div style={{ marginBottom: '2rem', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
                <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem', color: '#f59e0b' }}>
                  Susunan Campuran Asal ({data.stats.images_count} Foto + {data.stats.live_count} Live Klip)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem' }}>
                  {data.items.map((item: any, i: number) => (
                    <div key={i} style={{ background: '#0f172a', padding: '6px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <span style={{ fontSize: '0.7rem', color: item.type === 'vid' ? '#818cf8' : '#38bdf8', fontWeight: 'bold' }}>
                        {item.type === 'vid' ? `🎥 Live #${item.index}` : `🖼️ Foto #${item.index}`}
                      </span>
                      {item.type === 'vid' ? (
                        <video src={item.url} controls style={{ width: '100%', height: '120px', borderRadius: '4px', marginTop: '4px', background: '#000' }} />
                      ) : (
                        <img src={item.url} alt={`item-${i}`} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />
                      )}
                      <a href={item.url} target="_blank" download={`mixed_${item.index}`} style={{ display: 'block', textAlign: 'center', background: '#1e293b', color: '#e2e8f0', fontSize: '0.7rem', padding: '4px 0', borderRadius: '4px', marginTop: '4px', textDecoration: 'none' }}>
                        Simpan #{item.index}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Audio Asal (MP3) */}
            {data.music && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1.2rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#a78bfa' }}>Trek Audio TikTok (MP3)</h3>
                <audio ref={audioRef} src={data.music} controls style={{ width: '100%', marginBottom: '0.8rem' }} />
                <a href={data.music} target="_blank" download="tiktok_audio.mp3" style={{ display: 'inline-block', background: '#7c3aed', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', textDecoration: 'none' }}>
                  🎵 Muat Turun Audio MP3
                </a>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
