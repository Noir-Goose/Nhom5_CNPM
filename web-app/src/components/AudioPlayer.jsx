import { useEffect, useState } from "react";

function AudioPlayer({ poi, language, speechLanguage }) {
  const [status, setStatus] = useState("idle");

  const content = poi?.content[language];

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setStatus("idle");
  }, [poi, language]);

  if (!poi || !content) {
    return null;
  }

  const speak = () => {
    if (!("speechSynthesis" in window)) {
      setStatus("unsupported");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(content.speechText);

    utterance.lang = speechLanguage;

    utterance.onstart = () => {
      setStatus("playing");
    };

    utterance.onend = () => {
      setStatus("idle");
    };

    utterance.onerror = () => {
      setStatus("error");
    };

    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus("paused");
  };

  const resume = () => {
    window.speechSynthesis.resume();
    setStatus("playing");
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setStatus("idle");
  };

  return (
    <div className="audio-player">
      <div className="audio-info">
        <div className="audio-icon">
          🔊
        </div>

        <div>
          <span>THUYẾT MINH</span>

          <strong>{content.name}</strong>

          <small>
            {status === "playing"
              ? "Đang phát"
              : status === "paused"
                ? "Đang tạm dừng"
                : status === "unsupported"
                  ? "Trình duyệt không hỗ trợ đọc thoại"
                  : "Sẵn sàng phát"}
          </small>
        </div>
      </div>

      <div className="audio-controls">
        {status === "playing" ? (
          <button type="button" onClick={pause}>
            ❚❚
          </button>
        ) : status === "paused" ? (
          <button type="button" onClick={resume}>
            ▶
          </button>
        ) : (
          <button type="button" onClick={speak}>
            ▶
          </button>
        )}

        <button
          type="button"
          onClick={stop}
          disabled={status === "idle"}
        >
          ■
        </button>
      </div>
    </div>
  );
}

export default AudioPlayer;