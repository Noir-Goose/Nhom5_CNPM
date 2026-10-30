import { useEffect, useRef, useState } from "react";
import { uiLabels } from "../data/i18n/uiLabels";
import { recordTourEvent } from "../services/tourAnalyticsService";

function AudioPlayer({ poi, language, speechLanguage }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speechError, setSpeechError] = useState("");
  const currentPlayback = useRef(null);
  const pendingSeek = useRef(null);

  const content = poi?.content?.[language] ?? poi?.content?.vi ?? {};
  const name = content.name ?? poi?.name ?? "";
  const description = content.description ?? poi?.description ?? "";
  const textToSpeak = [name, description].filter(Boolean).join(". ");
  const labels = uiLabels.audio;
  const current = (key) => labels[key]?.[language] ?? labels[key]?.vi ?? "";
  const speechSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined";

  useEffect(() => {
    return () => {
      if (currentPlayback.current) {
        currentPlayback.current.cancelled = true;
        currentPlayback.current.generation += 1;
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakFrom = (startCharacter = 0, existingPlayback = null) => {
    if (!speechSupported) {
      setSpeechError(current("unsupported"));
      return;
    }

    if (!textToSpeak.trim()) {
      setSpeechError(current("empty"));
      return;
    }

    const previousPlayback = currentPlayback.current;
    if (previousPlayback) {
      previousPlayback.generation += 1;
      if (!existingPlayback) previousPlayback.cancelled = true;
    }
    window.speechSynthesis.cancel();

    const playback = existingPlayback ?? {
      startedAt: null,
      pausedAt: null,
      pausedDurationMs: 0,
      cancelled: false,
      generation: 0,
    };
    playback.offset = startCharacter;
    playback.generation += 1;
    const generation = playback.generation;
    currentPlayback.current = playback;
    setSpeechError("");
    setProgress(Math.round((startCharacter / textToSpeak.length) * 100));

    const utterance = new window.SpeechSynthesisUtterance(
      textToSpeak.slice(startCharacter),
    );
    utterance.lang = speechLanguage || "vi-VN";
    utterance.rate = 0.9;

    const isCurrentPlayback = () =>
      currentPlayback.current === playback && playback.generation === generation;

    utterance.onstart = () => {
      if (!isCurrentPlayback()) return;
      setIsSpeaking(true);
      setIsPaused(false);
      if (playback.startedAt === null) {
        playback.startedAt = Date.now();
        if (poi?.id != null) {
          void recordTourEvent({
            eventType: "started",
            poiId: String(poi.id),
            language,
          }).catch(() => {});
        }
      }
    };

    utterance.onboundary = (event) => {
      if (!isCurrentPlayback() || !Number.isFinite(event.charIndex)) return;
      const characterPosition = Math.min(
        textToSpeak.length,
        playback.offset + event.charIndex + Math.max(event.charLength || 1, 1),
      );
      setProgress(Math.round((characterPosition / textToSpeak.length) * 100));
    };

    utterance.onend = () => {
      if (!isCurrentPlayback()) return;
      setProgress(100);
      setIsSpeaking(false);
      setIsPaused(false);
      if (playback.startedAt && !playback.cancelled && poi?.id != null) {
        const durationSeconds = Math.max(
          0,
          Math.round(
            (Date.now() - playback.startedAt - playback.pausedDurationMs) / 1000,
          ),
        );
        void recordTourEvent({
          eventType: "completed",
          poiId: String(poi.id),
          language,
          durationSeconds,
        }).catch(() => {});
      }
      currentPlayback.current = null;
    };

    utterance.onerror = (event) => {
      if (!isCurrentPlayback()) return;
      setIsSpeaking(false);
      setIsPaused(false);
      if (event.error === "canceled" || event.error === "interrupted") {
        playback.cancelled = true;
      } else {
        setSpeechError(current("error"));
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = () => {
    if (!speechSupported) {
      setSpeechError(current("unsupported"));
      return;
    }

    if (isPaused) {
      const playback = currentPlayback.current;
      if (playback?.pausedAt) {
        playback.pausedDurationMs += Date.now() - playback.pausedAt;
        playback.pausedAt = null;
      }
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    } else if (isSpeaking) {
      const playback = currentPlayback.current;
      if (playback) playback.pausedAt = Date.now();
      window.speechSynthesis.pause();
      setIsSpeaking(false);
      setIsPaused(true);
    } else {
      speakFrom(0);
    }
  };

  const handleStop = () => {
    if (currentPlayback.current) {
      currentPlayback.current.cancelled = true;
      currentPlayback.current.generation += 1;
    }
    window.speechSynthesis?.cancel();
    currentPlayback.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
    setSpeechError("");
  };

  const commitSeek = () => {
    if (pendingSeek.current === null) return;
    const nextProgress = pendingSeek.current;
    pendingSeek.current = null;
    const startCharacter = Math.min(
      textToSpeak.length - 1,
      Math.round((nextProgress / 100) * textToSpeak.length),
    );
    const playback = currentPlayback.current;
    if (playback?.pausedAt) {
      playback.pausedDurationMs += Date.now() - playback.pausedAt;
      playback.pausedAt = null;
    }
    speakFrom(Math.max(0, startCharacter), playback);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  return (
    <div className="audio-player">
      <div className="audio-player-controls">
        <button
          type="button"
          className="audio-player-button"
          onClick={handlePlayPause}
          disabled={!textToSpeak.trim()}
          aria-label={
            isPaused
              ? current("resume")
              : isSpeaking
                ? current("pause")
                : current("play").replace(/^🔊\s*/, "")
          }
        >
          {isPaused
            ? current("resume")
            : isSpeaking
              ? current("pause")
              : current("play")}
        </button>
        {(isSpeaking || isPaused || progress > 0) && (
          <button
            type="button"
            className="audio-player-stop"
            onClick={handleStop}
            aria-label={current("stop")}
          >
            {current("stop")}
          </button>
        )}
      </div>

      {speechSupported && textToSpeak.trim() && (
        <div className="audio-player-progress">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={progress}
            onChange={(event) => {
              pendingSeek.current = Number(event.target.value);
              setProgress(pendingSeek.current);
            }}
            onPointerUp={commitSeek}
            onKeyUp={commitSeek}
            aria-label={current("position")}
          />
          <span>{progress}%</span>
        </div>
      )}

      {speechError && (
        <p className="audio-player-error" role="alert">
          {speechError}
        </p>
      )}
    </div>
  );
}

export default AudioPlayer;
