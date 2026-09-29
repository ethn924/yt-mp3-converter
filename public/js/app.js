const form = document.getElementById('converter-form');
const input = document.getElementById('youtube-url');
const convertBtn = document.getElementById('convert-btn');
const btnText = convertBtn.querySelector('.btn-text');
const btnSpinner = convertBtn.querySelector('.btn-spinner');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const resultMeta = document.getElementById('result-meta');
const downloadLink = document.getElementById('download-link');

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
}

function hideStatus() { statusEl.classList.add('hidden'); }
function hideResult() { resultEl.classList.add('hidden'); }

function setLoading(loading) {
  convertBtn.disabled = loading;
  btnText.classList.toggle('hidden', loading);
  btnSpinner.classList.toggle('hidden', !loading);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  hideStatus();
  hideResult();
  setLoading(true);
  showStatus('⏳ Conversion en cours… Cela peut prendre 10 à 30 secondes.', 'info');

  try {
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);

    hideStatus();
    setLoading(false);
    resultMeta.textContent = `Taille : ${formatBytes(data.fileSize)} · ID : ${data.videoId}`;
    downloadLink.href = data.downloadUrl;
    downloadLink.setAttribute('download', data.fileName);
    resultEl.classList.remove('hidden');
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    setLoading(false);
    showStatus(`❌ ${err.message}`, 'error');
  }
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
});
