// ===== PWA SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ===== PWA INSTALL PROMPT =====
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.classList.add('visible');
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      installBtn.classList.remove('visible');
    }
    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.classList.remove('visible');
  deferredPrompt = null;
});
