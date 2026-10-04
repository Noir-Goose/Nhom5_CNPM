import {
  useEffect,
  useRef,
  useState,
} from "react";

import { uiLabels } from "../data/mockPois";

function AudioPlayer({
  poi,
  language,
  speechLanguage,
}) {
  const [status, setStatus] = useState("idle");

  const currentIndexRef = useRef(0);
  const isStoppingRef = useRef(false);

  const content = poi?.content?.[language];

  const narrationText =
    content?.speechText ||
    content?.description;

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  if (!poi || !content) {
    return null;
  }

  const speakFrom = (startIndex = 0) => {
    if (!("speechSynthesis" in window)) {
      setStatus("unsupported");
      return;
    }

    if (!narrationText) {
      setStatus("error");
      return;
    }

    const remainingText =
      narrationText.slice(startIndex);

    if (!remainingText.trim()) {
      currentIndexRef.current = 0;
      setStatus("finished");
      return;
    }

    window.speechSynthesis.cancel();

    isStoppingRef.current = false;

    const utterance =
      new SpeechSynthesisUtterance(
        remainingText
      );

    utterance.lang = speechLanguage;

    utterance.onstart = () => {
      if (!isStoppingRef.current) {
        setStatus("playing");
      }
    };

    utterance.onboundary = (event) => {
      currentIndexRef.current =
        startIndex + event.charIndex;
    };

    utterance.onend = () => {
      if (isStoppingRef.current) {
        return;
      }

      currentIndexRef.current = 0;
      setStatus("finished");
    };

    utterance.onerror = () => {
      if (isStoppingRef.current) {
        return;
      }

      setStatus("error");
    };

    window.speechSynthesis.speak(utterance);
  };

  const speak = () => {
    currentIndexRef.current = 0;
    speakFrom(0);
  };

  const pause = () => {
    if (status !== "playing") {
      return;
    }

    isStoppingRef.current = true;

    window.speechSynthesis.cancel();

    setStatus("paused");
  };

  const resume = () => {
    if (status !== "paused") {
      return;
    }

    speakFrom(currentIndexRef.current);
  };

  const stop = () => {
    isStoppingRef.current = true;

    window.speechSynthesis.cancel();

    currentIndexRef.current = 0;

    setStatus("idle");
  };

  const handleMainButton = () => {
    if (status === "playing") {
      pause();
      return;
    }

    if (status === "paused") {
      resume();
      return;
    }

    speak();
  };

  // =========================
  // Trạng thái ban đầu
  // =========================
  if (status === "idle") {
    return (
      <button
        type="button"
        className="listen-button"
        onClick={speak}
      >
        {uiLabels.listenAudio[language]}
      </button>
    );
  }

  let statusText =
    uiLabels.audio.playing[language];

  if (status === "paused") {
    statusText =
      uiLabels.audio.paused[language];
  }

  if (status === "finished") {
    statusText =
      uiLabels.audio.finished[language];
  }

  if (status === "unsupported") {
    statusText =
      uiLabels.audio.unsupported[language];
  }

  if (status === "error") {
    statusText =
      uiLabels.audio.error[language];
  }

  return (
    <div className="audio-controls">
      <button
        type="button"
        className="audio-main-button"
        onClick={handleMainButton}
        aria-label={
          status === "playing"
            ? uiLabels.audio.paused[language]
            : status === "paused"
              ? uiLabels.audio.playing[language]
              : uiLabels.listenAudio[language]
        }
      >
        {status === "playing"
          ? "❚❚"
          : status === "finished"
            ? "↻"
            : "▶"}
      </button>

      <button
        type="button"
        className="audio-exit-button"
        onClick={stop}
      >
        {uiLabels.audio.exit[language]}
      </button>

      <span className="audio-status">
        {statusText}
      </span>
    </div>
  );
}

export default AudioPlayer;