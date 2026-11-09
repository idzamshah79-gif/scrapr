interface TikTokData {
  title: string;
  video: string | null;
  music: string | null;
  images: string[];
  live: string[];
  items: Array<{ type: 'img' | 'vid'; url: string }>;
  isStory: boolean;
}

const urlInput = document.getElementById('urlInput') as HTMLInputElement;
const fetchBtn = document.getElementById('fetchBtn') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const result = document.getElementById('result') as HTMLDivElement;

fetchBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) return alert('Sila masukkan URL TikTok!');

  loader.classList.remove('hidden');
  result.classList.add('hidden');
  result.innerHTML = '';

  try {
    const res = await fetch(`/api/tiktok?url=${encodeURIComponent(url)}`);
    const data: TikTokData = await res.json();

    if (!res.ok) throw new Error((data as any).error || 'Gagal memproses data');

    renderResult(data);
  } catch (err: any) {
    result.innerHTML = `<div class="error-msg">❌ ${err.message}</div>`;
    result.classList.remove('hidden');
  } finally {
    loader.classList.add('hidden');
  }
});

function renderResult(data: TikTokData) {
  let html = `<div class="media-card">
    <h3>${escapeHtml(data.title)}</h3>`;

  // 1. Video Single
  if (data.video) {
    html += `
      <video controls src="${data.video}" class="preview-media"></video>
      <div class="btn-group">
        <a href="${data.video}" target="_blank" download="tiktok_video.mp4" class="btn">Muat Turun Video HD</a>
      </div>
    `;
  }

  // 2. Galeri Foto / Slide
  if (data.images.length > 0) {
    html += `<h4>Foto / Slide (${data.images.length})</h4><div class="gallery-grid">`;
    data.images.forEach((img, i) => {
      html += `
        <div class="gallery-item">
          <img src="${img}" loading="lazy" />
          <a href="${img}" target="_blank" download="slide_${i + 1}.jpg" class="dl-tag">#${i + 1} Simpan</a>
        </div>
      `;
    });
    html += `</div>`;
  }

  // 3. Live Clips
  if (data.live.length > 0) {
    html += `<h4>Live Photo Clips (${data.live.length})</h4><div class="clip-grid">`;
    data.live.forEach((clip, i) => {
      html += `
        <div class="clip-item">
          <video controls src="${clip}" preload="none"></video>
          <a href="${clip}" target="_blank" download="live_${i + 1}.mp4" class="dl-tag">Klip #${i + 1}</a>
        </div>
      `;
    });
    html += `</div>`;
  }

  // 4. Audio MP3
  if (data.music) {
    html += `
      <div class="audio-box">
        <h4>Trek Audio TikTok</h4>
        <audio controls src="${data.music}"></audio>
        <a href="${data.music}" target="_blank" download="tiktok_audio.mp3" class="btn btn-audio">Muat Turun MP3</a>
      </div>
    `;
  }

  html += `</div>`;
  result.innerHTML = html;
  result.classList.remove('hidden');
}

function escapeHtml(str: string): string {
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}
