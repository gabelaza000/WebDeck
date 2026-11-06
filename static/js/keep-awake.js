(function () {
  // Check if WebDeck config enabled this setting
  // (or pass directly via template: window.PREVENT_SCREEN_LOCK)
  const isEnabled = {{ 'true' if config['settings'].get('prevent_screen_lock') else 'false' }};

  if (!isEnabled) return;

  let videoElement = null;

  function enableKeepAwake() {
    // 1. Fallback to Screen Wake Lock API if available (e.g., if ever served over HTTPS or localhost)
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(() => {});
      return;
    }

    // 2. HTTP Workaround for mobile: Tiny invisible looping video
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('webkit-playsinline', '');
      videoElement.setAttribute('loop', '');
      videoElement.setAttribute('muted', '');
      videoElement.muted = true;
      videoElement.volume = 0;
      videoElement.style.position = 'fixed';
      videoElement.style.top = '-9999px';
      videoElement.style.left = '-9999px';
      videoElement.style.width = '1px';
      videoElement.style.height = '1px';
      videoElement.style.opacity = '0';
      videoElement.style.pointerEvents = 'none';

      // Tiny base64-encoded blank MP4 video
      videoElement.src = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhmZGF0AAAAAA==';
      document.body.appendChild(videoElement);
    }

    videoElement.play().catch(() => {});
  }

  // Mobile browsers require a user interaction to trigger video playback
  const enableOnFirstTouch = () => {
    enableKeepAwake();
    window.removeEventListener('touchstart', enableOnFirstTouch);
    window.removeEventListener('click', enableOnFirstTouch);
  };

  window.addEventListener('touchstart', enableOnFirstTouch, { once: true });
  window.addEventListener('click', enableOnFirstTouch, { once: true });

  // Re-acquire if the user switches apps and comes back
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      enableKeepAwake();
    }
  });
})();t