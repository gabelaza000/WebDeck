(function () {
  let wakeLockSentinel = null;
  let videoElement = null;
  let isActivated = false;

  // Check whether keep-awake is enabled in settings
  function isEnabled() {
    if (typeof window.PREVENT_SCREEN_LOCK !== "undefined") {
      return Boolean(window.PREVENT_SCREEN_LOCK);
    }
    const checkbox = document.getElementById("prevent_screen_lock");
    if (checkbox) {
      return checkbox.checked;
    }
    return false;
  }

  // Create or obtain the invisible looping video element
  function getVideoElement() {
    if (videoElement) return videoElement;

    videoElement = document.createElement("video");
    videoElement.setAttribute("playsinline", "");
    videoElement.setAttribute("webkit-playsinline", "");
    videoElement.setAttribute("loop", "");
    videoElement.setAttribute("muted", "");
    videoElement.muted = true;
    videoElement.volume = 0;
    videoElement.style.position = "fixed";
    videoElement.style.top = "-9999px";
    videoElement.style.left = "-9999px";
    videoElement.style.width = "1px";
    videoElement.style.height = "1px";
    videoElement.style.opacity = "0";
    videoElement.style.pointerEvents = "none";

    // 1. Try a 1x1 Canvas captureStream (supported on modern mobile browsers)
    let stream = null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillRect(0, 0, 1, 1);
        if (typeof canvas.captureStream === "function") {
          stream = canvas.captureStream(1);
        } else if (typeof canvas.webkitCaptureStream === "function") {
          stream = canvas.webkitCaptureStream(1);
        }
      }
    } catch (e) {
      stream = null;
    }

    if (stream) {
      videoElement.srcObject = stream;
    } else {
      // 2. Fallback to valid minimal single-frame WebM data URI
      videoElement.src =
        "data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=";
    }

    const container = document.body || document.documentElement;
    if (container) {
      container.appendChild(videoElement);
    }

    return videoElement;
  }

  async function enableKeepAwake() {
    if (!isEnabled()) return;

    // 1. Try native Screen Wake Lock API if available (HTTPS or localhost)
    if ("wakeLock" in navigator && typeof navigator.wakeLock.request === "function") {
      try {
        wakeLockSentinel = await navigator.wakeLock.request("screen");
        wakeLockSentinel.addEventListener("release", () => {
          wakeLockSentinel = null;
        });
        isActivated = true;
        return;
      } catch (err) {
        // Over HTTP, wakeLock may throw NotAllowedError; fall through to video method
      }
    }

    // 2. Fallback for HTTP on mobile: play the invisible looping video
    try {
      const video = getVideoElement();
      if (video) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              isActivated = true;
            })
            .catch(() => {
              // Browser blocked autoplay before user gesture; will re-attempt on touch/click
            });
        }
      }
    } catch (err) {
      console.warn("[WebDeck] KeepAwake video fallback error:", err);
    }
  }

  function disableKeepAwake() {
    isActivated = false;
    if (wakeLockSentinel) {
      try {
        wakeLockSentinel.release();
      } catch (e) {}
      wakeLockSentinel = null;
    }
    if (videoElement) {
      try {
        videoElement.pause();
      } catch (e) {}
    }
  }

  // Handle user gestures (mobile browsers require a user interaction to start media playback)
  function onUserGesture() {
    if (isEnabled() && !isActivated) {
      enableKeepAwake();
    }
  }

  // Attach gesture listeners
  window.addEventListener("touchstart", onUserGesture, { passive: true });
  window.addEventListener("touchend", onUserGesture, { passive: true });
  window.addEventListener("click", onUserGesture, { passive: true });
  window.addEventListener("pointerdown", onUserGesture, { passive: true });

  // Re-acquire lock when tab or phone screen becomes active again
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isEnabled()) {
      enableKeepAwake();
    }
  });

  // Setup once DOM is ready (listen to toggle switch and attempt immediate activation)
  function init() {
    const checkbox = document.getElementById("prevent_screen_lock");
    if (checkbox) {
      checkbox.addEventListener("change", function () {
        window.PREVENT_SCREEN_LOCK = this.checked;
        if (this.checked) {
          enableKeepAwake();
        } else {
          disableKeepAwake();
        }
      });
    }

    if (isEnabled()) {
      enableKeepAwake();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
