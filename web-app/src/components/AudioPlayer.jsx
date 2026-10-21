
import { useEffect, useRef, useState } from "react";
import { uiLabels } from "../data/i18n/uiLabels";
import { recordTourEvent } from "../services/tourAnalyticsService";

function AudioPlayer({ poi, language, speechLanguage }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const currentPlayback = useRef(null);

  const content =
    poi?.content?.[language] ??
    poi?.content?.vi ??
    {};

  const name = content.name ?? poi?.name ?? "";
  const description =
    content.description ?? poi?.description ?? "";

  const textToSpeak = [name, description]
    .filter(Boolean)
    .join(". ");
  const labels = uiLabels.audio;
  const current = (key) => labels[key]?.[language] ?? labels[key]?.vi ?? "";

  useEffect(() => {
    return () => {
      if (currentPlayback.current) currentPlayback.current.cancelled = true;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handlePlay = () => {
    if (!("speechSynthesis" in window)) {
      setSpeechError(current("unsupported"));
      return;
    }

    if (!textToSpeak.trim()) {
      setSpeechError(current("empty"));
      return;
    }

    window.speechSynthesis.cancel();
    setSpeechError("");

    // [TOUR-AN-005] Gắn mốc thời gian cho lượt nghe hiện tại, không lưu thông tin người nghe.
    const playback = { startedAt: null, cancelled: false };
    currentPlayback.current = playback;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = speechLanguage || "vi-VN";
    utterance.rate = 0.9;

    utterance.onstart = () => {
      playback.startedAt = Date.now();
      setIsSpeaking(true);
      if (poi?.id != null) {
        void recordTourEvent({ eventType: "started", poiId: String(poi.id), language })
          .catch(() => {});
      }
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      if (playback.startedAt && !playback.cancelled && poi?.id != null) {
        const durationSeconds = Math.max(0, Math.round((Date.now() - playback.startedAt) / 1000));
        void recordTourEvent({
          eventType: "completed",
          poiId: String(poi.id),
          language,
          durationSeconds,
        }).catch(() => {});
      }
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      if (event.error === "canceled" || event.error === "interrupted") {
        playback.cancelled = true;
      }

      if (
        event.error !== "canceled" &&
        event.error !== "interrupted"
      ) {
        setSpeechError(current("error"));
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStop = () => {
    if (currentPlayback.current) currentPlayback.current.cancelled = true;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSpeechError("");
  };

  return (
    <div className="audio-player">
      <button
        type="button"
        className="audio-player-button"
        onClick={isSpeaking ? handleStop : handlePlay}
        disabled={!textToSpeak.trim()}
        aria-label={
          isSpeaking ? current("stop").replace(/^⏹\s*/, "") : current("play").replace(/^🔊\s*/, "")
        }
      >
        {isSpeaking ? current("stop") : current("play")}
      </button>

      {speechError && (
        <p className="audio-player-error" role="alert">
          {speechError}
        </p>
      )}
    </div>
  );
}

export default AudioPlayer;
