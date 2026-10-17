
import { useEffect, useState } from "react";
import { uiLabels } from "../data/i18n/uiLabels";

function AudioPlayer({ poi, language, speechLanguage }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");

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

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = speechLanguage || "vi-VN";
    utterance.rate = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    utterance.onerror = (event) => {
      setIsSpeaking(false);

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
