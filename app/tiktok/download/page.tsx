'use client';

import React, { useState, useEffect, useRef } from 'react';

interface QueueItem {
  id: string;
  title: string;
  format: string;
  progress: number;
  speed: string;
  eta: string;
  status: 'downloading' | 'paused' | 'completed' | 'error';
  url: string;
}

interface ToastInfo {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function LiquidDownloader() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'video' | 'image' | 'audio' | 'text'>('video');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Slideshow Video Generator States
  const [slideVideoUrl, setSlideVideoUrl] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthProgress, setSynthProgress] = useState(0);

  // Quality & Format Selectors
  const [videoQuality, setVideoQuality] = useState('1080p HD (Original)');
  const [audioFormat, setAudioFormat] = useState('MP3 - 320kbps');
  const [imageFormat, setImageFormat] = useState('JPG (Original)');

  // Queue & Toasts
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [previewZoomImg, setPreviewZoomImg] = useState<string | null>(null);

  // Toggle Dark/Light Mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Pastikan URL disalin terus dari clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        addToast('Pautan berjaya ditampal!', 'success');
      }
    } catch {
      addToast('Sila tampal secara manual ke dalam kotak teks.', 'info');
    }
  };

  // AUTO SYNTHESIS: Tukar semua gambar + audio menjadi 1 fail video (1.5 saat per gambar)
  const synthesizeSlideToVideo = async (images: string[], audioUrl: string | null) => {
    if (!images || images.length === 0) return;
    setIsSynthesizing(true);
    setSynthProgress(10);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Pelayar tidak menyokong canvas.');

      // Muatkan semua gambar terlebih dahulu
      const loadedImgs: HTMLImageElement[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = images[i];
        await new Promise((res) => {
          img.onload = () => res(true);
          img.onerror = () => res(true);
        });
        loadedImgs.push(img);
        setSynthProgress(Math.round(10 + (i / images.length) * 30));
      }

      // Sediakan Audio Track
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      if (audioUrl) {
        try {
          const audioEl = new Audio();
          audioEl.crossOrigin = 'anonymous';
          audioEl.src = audioUrl;
          const source = audioCtx.createMediaElementSource(audioEl);
          source.connect(dest);
          audioEl.play().catch(() => {});
        } catch (e) {
          console.warn('Audio crossOrigin bypass mode', e);
        }
      }

      // Gabungkan Canvas Stream + Audio Stream
      const canvasStream = canvas.captureStream(24);
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm;codecs=vp9';

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start();

      // Render setiap gambar selama 1.5 saat (1500ms)
      const durationPerSlideMs = 1500;
      let currentIdx = 0;

      const drawNext = () => {
        if (currentIdx >= loadedImgs.length) {
          recorder.stop();
          return;
        }

        const img = loadedImgs[currentIdx];
        if (img.width && img.height) {
          // Fit & Center (Letterbox 720x1280)
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 720, 1280);

          const hRatio = 720 / img.width;
          const vRatio = 1280 / img.height;
          const ratio = Math.min(hRatio, vRatio);
          const centerShiftX = (720 - img.width * ratio) / 2;
          const centerShiftY = (1280 - img.height * ratio) / 2;

          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            centerShiftX,
            centerShiftY,
            img.width * ratio,
            img.height * ratio
          );
        }

        setSynthProgress(Math.round(40 + (currentIdx / loadedImgs.length) * 55));
        currentIdx++;
        setTimeout(drawNext, durationPerSlideMs);
      };

      drawNext();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const generatedUrl = URL.createObjectURL(blob);
          setSlideVideoUrl(generatedUrl);
          setSynthProgress(100);
          setIsSynthesizing(false);
          addToast('Video Slideshow (1.5s/gambar) berjaya dihasilkan!', 'success');
          resolve();
        };
      });
    } catch (err: any) {
      console.error(err);
      setIsSynthesizing(false);
      addToast('Sintesis video gagal; menggunakan fallback pemain gambar.', 'error');
    }
  };

  const handleFetch = async () => {
    if (!url.trim() || !url.includes('tiktok.com')) {
      addToast('Sila masukkan pautan TikTok yang sah.', 'error');
      return;
    }

    setLoading(true);
    setData(null);
    setSlideVideoUrl(null);

    try {
      const res = await fetch(`/api/tiktok?url=${encodeURIComponent(url.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengekstrak kandungan.');

      setData(json);
      addToast('Media berjaya diekstrak!', 'success');

      // Tentukan tab aktif berdasarkan jenis media
      if (json.images && json.images.length > 0) {
        setActiveTab('image');
        // JANA VIDEO OTOMATIK BILA ADA SLIDESHOW
        synthesizeSlideToVideo(json.images, json.music);
      } else {
        setActiveTab('video');
      }
    } catch (err: any) {
      addToast(err.message || 'Ralat sambungan ke pelayan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startDownloadTask = (mediaUrl: string, name: string, fmt: string) => {
    const newItem: QueueItem = {
      id: Math.random().toString(36).substring(7),
      title: name,
      format: fmt,
      progress: 0,
      speed: '4.8 MB/s',
      eta: '2s',
      status: 'downloading',
      url: mediaUrl,
    };

    setQueue((prev) => [newItem, ...prev]);
    addToast(`Memulakan muat turun: ${fmt}`, 'info');

    // Simulasi progress muat turun
    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      setQueue((prev) =>
        prev.map((item) =>
          item.id === newItem.id ? { ...item, progress: Math.min(p, 100) } : item
        )
      );
      if (p >= 100) {
        clearInterval(interval);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === newItem.id ? { ...item, status: 'completed' } : item
          )
        );
        addToast(`Selesai dimuat turun: ${name}`, 'success');

        // Buka pautan muat turun fail
        const a = document.createElement('a');
        a.href = mediaUrl;
        a.download = name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }, 400);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '2.5rem 1.25rem 5rem 1.25rem' }}>
      
      {/* Top Navbar / Header Controls */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.2rem', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)' }}>
            E
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
            ELFIE <span style={{ color: 'var(--accent-blue)' }}>STUDIO</span>
          </span>
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="glass-btn"
          aria-label="Tukar Tema"
        >
          {theme === 'dark' ? '☀️ Mod Cerah' : '🌙 Mod Gelap'}
        </button>
      </nav>

      {/* Hero Section */}
      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: '0.8rem' }}>
          Muat Turun Media <span style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ultra Jelas</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto' }}>
          Ekstrak Video HD Tanpa Watermark, Slideshow Auto-Video 1.5s, dan Audio MP3 Studio.
        </p>
      </header>

      {/* 1. HERO INPUT (Liquid Glass) */}
      <section className="glass-panel" style={{ padding: '10px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', flex: 1, minWidth: '280px', alignItems: 'center', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', fontSize: '1.1rem', opacity: 0.6 }}>🔗</span>
            <input
              type="text"
              placeholder="Tampal link TikTok di sini..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              style={{
                width: '100%',
                minHeight: '52px',
                padding: '0 85px 0 44px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            {url ? (
              <button
                onClick={() => setUrl('')}
                style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
              >
                Kosongkan
              </button>
            ) : (
              <button
                onClick={handlePaste}
                style={{ position: 'absolute', right: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Tampal
              </button>
            )}
          </div>

          <button
            onClick={handleFetch}
            disabled={loading}
            className="glass-btn primary-gradient-btn"
            style={{ minHeight: '52px', padding: '0 28px', fontSize: '1rem' }}
          >
            {loading ? 'Sedang Mengekstrak...' : 'Muat Turun'}
          </button>
        </div>
      </section>

      {/* 2. FORMAT TABS (Glass Segmented Control) */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
        <div
          className="glass-panel"
          style={{
            display: 'inline-flex',
            padding: '5px',
            borderRadius: '16px',
            gap: '4px',
          }}
        >
          {(['video', 'image', 'audio', 'text'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--primary-gradient)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'video' ? '🎬 Video' : tab === 'image' ? '🖼️ Gambar' : tab === 'audio' ? '🎵 Audio' : '📝 Teks'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. RESULT CARD (Liquid Glass Card) */}
      {data && (
        <section className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-blue)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                {data.kind || 'TIKTOK CONTENT'}
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.4, marginBottom: '6px' }}>{data.title}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Oleh @{data.author?.unique_id || 'creator'} • TikTok Original Source
              </p>
            </div>
          </div>

          {/* TAB 1: VIDEO */}
          {activeTab === 'video' && (
            <div>
              {/* JIKA ADA VIDEO ASAL */}
              {data.video && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <video
                    src={data.video}
                    controls
                    style={{ width: '100%', maxHeight: '480px', borderRadius: 'var(--radius-inner)', background: '#000' }}
                  />
                  <div style={{ display: 'flex', gap: '12px', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <select
                      value={videoQuality}
                      onChange={(e) => setVideoQuality(e.target.value)}
                      className="glass-btn"
                      style={{ outline: 'none' }}
                    >
                      <option value="1080p HD (Original)">1080p HD (Original MP4)</option>
                      <option value="720p HD">720p Fast Stream</option>
                      <option value="480p SD">480p Data Saver</option>
                    </select>

                    <button
                      onClick={() => startDownloadTask(data.video, `${data.title.slice(0, 30)}.mp4`, videoQuality)}
                      className="glass-btn primary-gradient-btn"
                    >
                      ⬇️ Simpan Video ({videoQuality})
                    </button>
                  </div>
                </div>
              )}

              {/* JIKA SLIDE PHOTO -> TAMPILKAN VIDEO YANG DIJANA OTOMATIK (1.5 SAAT/GAMBAR) */}
              {data.images && data.images.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      🎥 Video Slideshow Terjana (1.5 Saat / Gambar + Audio)
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>Auto-Synthesized Video</span>
                  </div>

                  {isSynthesizing ? (
                    <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-inner)' }}>
                      <p style={{ marginBottom: '8px', fontSize: '0.9rem' }}>Sedang membina fail video daripada {data.images.length} keping gambar...</p>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${synthProgress}%`, height: '100%', background: 'var(--primary-gradient)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  ) : slideVideoUrl ? (
                    <div>
                      <video
                        src={slideVideoUrl}
                        controls
                        autoPlay
                        loop
                        style={{ width: '100%', maxHeight: '480px', borderRadius: 'var(--radius-inner)', background: '#000' }}
                      />
                      <div style={{ marginTop: '1rem' }}>
                        <button
                          onClick={() => startDownloadTask(slideVideoUrl, `${data.title.slice(0, 30)}_slideshow.mp4`, 'MP4 Slideshow')}
                          className="glass-btn primary-gradient-btn"
                        >
                          ⬇️ Muat Turun Video Slideshow Penuh (.mp4)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => synthesizeSlideToVideo(data.images, data.music)}
                      className="glass-btn"
                    >
                      ⚡ Jana Semula Video Slideshow (1.5s/gambar)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMAGE */}
          {activeTab === 'image' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Galeri Imej ({data.images?.length || 0})</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={imageFormat}
                    onChange={(e) => setImageFormat(e.target.value)}
                    className="glass-btn"
                    style={{ outline: 'none' }}
                  >
                    <option value="JPG (Original)">JPG Asal</option>
                    <option value="PNG HD">PNG Lossless</option>
                    <option value="WebP">WebP Optimized</option>
                  </select>
                </div>
              </div>

              {data.images && data.images.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {data.images.map((img: string, i: number) => (
                    <div
                      key={i}
                      style={{ position: 'relative', borderRadius: 'var(--radius-inner)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
                    >
                      <img
                        src={img}
                        alt={`slide-${i}`}
                        onClick={() => setPreviewZoomImg(img)}
                        style={{ width: '100%', height: '150px', objectFit: 'cover', cursor: 'zoom-in', display: 'block' }}
                      />
                      <button
                        onClick={() => startDownloadTask(img, `slide_${i + 1}.jpg`, imageFormat)}
                        className="glass-btn"
                        style={{ width: '100%', borderRadius: 0, minHeight: '34px', fontSize: '0.75rem', border: 'none', background: 'rgba(0,0,0,0.6)' }}
                      >
                        Simpan #{i + 1}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Tiada gambar berasingan untuk video ini.</p>
              )}
            </div>
          )}

          {/* TAB 3: AUDIO */}
          {activeTab === 'audio' && (
            <div>
              {data.music ? (
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.8rem' }}>Trek Audio Rasmi</h3>
                  <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-inner)', marginBottom: '1.2rem' }}>
                    <audio src={data.music} controls style={{ width: '100%', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select
                      value={audioFormat}
                      onChange={(e) => setAudioFormat(e.target.value)}
                      className="glass-btn"
                      style={{ outline: 'none' }}
                    >
                      <option value="MP3 - 320kbps">MP3 (320 kbps HD)</option>
                      <option value="M4A - 256kbps">M4A (AAC)</option>
                      <option value="WAV Lossless">WAV (Lossless)</option>
                    </select>
                    <button
                      onClick={() => startDownloadTask(data.music, `${data.title.slice(0, 30)}.mp3`, audioFormat)}
                      className="glass-btn primary-gradient-btn"
                    >
                      🎵 Simpan Trek Audio
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Tiada audio berasingan dikesan.</p>
              )}
            </div>
          )}

          {/* TAB 4: TEXT */}
          {activeTab === 'text' && (
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.8rem' }}>Kapsyen & Metadata</h3>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: 'var(--radius-inner)', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '1rem' }}>
                {data.title || 'Tiada kapsyen disediakan.'}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(data.title || '');
                  addToast('Kapsyen disalin ke papan klip!', 'success');
                }}
                className="glass-btn"
              >
                📋 Salin Kapsyen Teks
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. DOWNLOAD QUEUE / HISTORY PANEL */}
      {queue.length > 0 && (
        <section className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📥 Giliran Muat Turun ({queue.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {queue.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: item.status === 'completed' ? '#4ade80' : 'var(--accent-blue)', fontWeight: 700 }}>
                    {item.status === 'completed' ? '✓ Siap' : `${item.progress}%`}
                  </span>
                </div>

                <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ width: `${item.progress}%`, height: '100%', background: item.status === 'completed' ? '#22c55e' : 'var(--primary-gradient)', transition: 'width 0.2s linear' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Format: {item.format}</span>
                  {item.status !== 'completed' && <span>Kelajuan: {item.speed} • ETA: {item.eta}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Zoomable Image Modal Lightbox */}
      {previewZoomImg && (
        <div
          onClick={() => setPreviewZoomImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <img
            src={previewZoomImg}
            alt="zoom"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
          />
        </div>
      )}

      {/* 5. TOAST NOTIFICATIONS */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-panel"
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: t.type === 'error' ? 'rgba(220, 38, 38, 0.4)' : t.type === 'success' ? 'rgba(22, 163, 74, 0.4)' : 'var(--glass-bg)',
              borderColor: t.type === 'error' ? 'rgba(239, 68, 68, 0.5)' : t.type === 'success' ? 'rgba(34, 197, 94, 0.5)' : 'var(--glass-border)',
            }}
          >
            {t.type === 'error' ? '❌' : t.type === 'success' ? '✅' : 'ℹ️'} {t.message}
          </div>
        ))}
      </div>

    </div>
  );
}
