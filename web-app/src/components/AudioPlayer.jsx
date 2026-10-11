
import { useEffect, useState } from "react";

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

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handlePlay = () => {
    if (!("speechSynthesis" in window)) {
      setSpeechError("Trình duyệt không hỗ trợ thuyết minh.");
      return;
    }

    if (!textToSpeak.trim()) {
      setSpeechError("Địa điểm chưa có nội dung thuyết minh.");
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
        setSpeechError("Không thể phát thuyết minh. Vui lòng thử lại.");
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
          isSpeaking ? "Dừng thuyết minh" : "Nghe thuyết minh"
        }
      >
        {isSpeaking
          ? "⏹ Dừng thuyết minh"
          : "🔊 Nghe thuyết minh"}
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
