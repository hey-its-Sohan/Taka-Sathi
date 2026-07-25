import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Highly optimized custom hook to monitor ambient noise using Web Audio API and check for
 * consecutive transcription failures to detect crowd noise.
 * Includes downsampling (setInterval instead of requestAnimationFrame), Page Visibility API integration,
 * minimal memory footprints, and rigorous hardware resource release protocols.
 */
export default function useNoiseDetection({
  onCrowdDetected,
  volumeThreshold = -35,         // decibel threshold (dBFS)
  durationThreshold = 5000,      // duration in ms required to trigger crowd alert (e.g. 5 seconds)
  consecutiveFailuresLimit = 2,  // consecutive transcription failures limit
  cooldownTime = 300000,         // 5 minutes in ms
  checkIntervalMs = 1500,        // Check volume every 1.5 seconds (downsampled/throttled)
  enabled = true,
} = {}) {
  const [volume, setVolume] = useState(-Infinity);
  const [failuresCount, setFailuresCount] = useState(0);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const checkIntervalRef = useRef(null);
  
  // Track consecutive loud checks to compute elapsed duration
  const loudChecksCounterRef = useRef(0);

  const COOLDOWN_KEY = 'taka_sathi_crowd_alert_last_shown';

  // Check if cooldown timer is active
  const isCooldownActive = useCallback(() => {
    const lastShown = localStorage.getItem(COOLDOWN_KEY);
    if (!lastShown) return false;
    return Date.now() - parseInt(lastShown, 10) < cooldownTime;
  }, [cooldownTime]);

  // Trigger crowd detection alert
  const triggerAlert = useCallback(() => {
    if (isCooldownActive()) return;

    localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
    onCrowdDetected?.();
  }, [isCooldownActive, onCrowdDetected]);

  // Handle transcription success/failure
  const recordTranscriptionSuccess = useCallback(() => {
    setFailuresCount(0);
  }, []);

  const recordTranscriptionFailure = useCallback(() => {
    setFailuresCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= consecutiveFailuresLimit) {
        triggerAlert();
        return 0; // Reset failures count after alert
      }
      return nextCount;
    });
  }, [consecutiveFailuresLimit, triggerAlert]);

  // Clean up all hardware/audio resources
  const cleanup = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('[useNoiseDetection] Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      // Close context to free up hardware resources instantly
      try {
        ctx.close().catch(() => {});
      } catch (e) {
        console.warn('[useNoiseDetection] Error closing AudioContext:', e);
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    loudChecksCounterRef.current = 0;
  }, []);

  // Monitor visibility state changes (Page Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      if (document.visibilityState === 'hidden') {
        if (ctx.state === 'running') {
          ctx.suspend().catch(() => {});
          console.log('[useNoiseDetection] Page hidden: AudioContext suspended');
        }
      } else if (document.visibilityState === 'visible') {
        if (ctx.state === 'suspended' && enabled) {
          ctx.resume().catch(() => {});
          console.log('[useNoiseDetection] Page visible: AudioContext resumed');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    let active = true;

    const startMonitoring = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'microphone' }).catch(() => null);
          if (status?.state === 'denied') {
            console.warn('[useNoiseDetection] Microphone permission was denied.');
            return;
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256; // Smaller FFT size for memory efficiency
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Periodic, throttled checks (every checkIntervalMs instead of RAF)
        checkIntervalRef.current = setInterval(() => {
          if (!active || !analyserRef.current || (ctx && ctx.state === 'suspended')) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average frequency amplitude
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;

          // Convert to approximate decibels (-100 dB to 0 dB scale)
          // Average frequency range [0, 255] is mapped to dB
          const normalized = average / 255;
          const db = normalized > 0.0001 ? 20 * Math.log10(normalized) : -100;
          setVolume(Math.round(db));

          if (db > volumeThreshold) {
            // High noise detected in this check interval
            loudChecksCounterRef.current += 1;
            const elapsed = loudChecksCounterRef.current * checkIntervalMs;
            if (elapsed >= durationThreshold) {
              triggerAlert();
              // Reset counter to prevent repeated triggers in the same high-noise block
              loudChecksCounterRef.current = 0;
            }
          } else {
            // Noise dropped below threshold, reset the consecutive checks counter
            loudChecksCounterRef.current = 0;
          }
        }, checkIntervalMs);

        // Auto-resume if suspended by browser autoplay policy
        if (ctx.state === 'suspended') {
          const resumeCtx = () => {
            if (ctx.state === 'suspended' && document.visibilityState === 'visible') {
              ctx.resume().catch(() => {});
            }
            document.removeEventListener('click', resumeCtx);
          };
          document.addEventListener('click', resumeCtx);
        }

      } catch (err) {
        console.warn('[useNoiseDetection] Failed to initialize microphone stream:', err);
      }
    };

    startMonitoring();

    return () => {
      active = false;
      cleanup();
    };
  }, [enabled, volumeThreshold, durationThreshold, checkIntervalMs, triggerAlert, cleanup]);

  return {
    volume,
    failuresCount,
    recordTranscriptionSuccess,
    recordTranscriptionFailure,
  };
}
