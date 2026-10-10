export const languages = [
  {
    code: "vi",
    label: "Tiếng Việt",
    speech: "vi-VN",
  },
  {
    code: "en",
    label: "English",
    speech: "en-US",
  },
  {
    code: "zh",
    label: "中文",
    speech: "zh-CN",
  },
  {
    code: "ja",
    label: "日本語",
    speech: "ja-JP",
  },
  {
    code: "ko",
    label: "한국어",
    speech: "ko-KR",
  },
];

export const categories = [
  {
    key: "all",
    label: {
      vi: "Tất cả",
      en: "All",
      zh: "全部",
      ja: "すべて",
      ko: "전체",
    },
  },
  {
    key: "pho",
    label: {
      vi: "Phở",
      en: "Pho",
      zh: "河粉",
      ja: "フォー",
      ko: "쌀국수",
    },
  },
  {
    key: "banh-mi",
    label: {
      vi: "Bánh mì",
      en: "Banh Mi",
      zh: "越南法棍",
      ja: "バインミー",
      ko: "반미",
    },
  },
  {
    key: "food",
    label: {
      vi: "Món Việt",
      en: "Vietnamese Food",
      zh: "越南料理",
      ja: "ベトナム料理",
      ko: "베트남 음식",
    },
  },
  {
    key: "drink",
    label: {
      vi: "Đồ uống",
      en: "Drinks",
      zh: "饮料",
      ja: "ドリンク",
      ko: "음료",
    },
  },
];


export const uiLabels = {
  selectedPlace: {
    vi: "ĐỊA ĐIỂM ĐƯỢC CHỌN",
    en: "SELECTED PLACE",
    zh: "已选择的地点",
    ja: "選択した場所",
    ko: "선택한 장소",
  },

  listenAudio: {
    vi: "Nghe thuyết minh",
    en: "Listen to narration",
    zh: "播放讲解",
    ja: "音声ガイドを聞く",
    ko: "해설 듣기",
  },

  closePoi: {
    vi: "Đóng",
    en: "Close",
    zh: "关闭",
    ja: "閉じる",
    ko: "닫기",
  },

  audio: {
    playing: {
      vi: "Đang phát",
      en: "Playing",
      zh: "正在播放",
      ja: "再生中",
      ko: "재생 중",
    },

    paused: {
      vi: "Đang tạm dừng",
      en: "Paused",
      zh: "已暂停",
      ja: "一時停止",
      ko: "일시정지",
    },

    finished: {
      vi: "Đã phát xong",
      en: "Finished",
      zh: "播放完成",
      ja: "再生完了",
      ko: "재생 완료",
    },

    unsupported: {
      vi: "Trình duyệt không hỗ trợ đọc thoại",
      en: "Speech is not supported by this browser",
      zh: "此浏览器不支持语音朗读",
      ja: "このブラウザは音声読み上げに対応していません",
      ko: "이 브라우저는 음성 읽기를 지원하지 않습니다",
    },

    error: {
      vi: "Không thể phát thuyết minh",
      en: "Unable to play narration",
      zh: "无法播放讲解",
      ja: "音声ガイドを再生できません",
      ko: "해설을 재생할 수 없습니다",
    },

    exit: {
      vi: "Thoát",
      en: "Exit",
      zh: "退出",
      ja: "終了",
      ko: "나가기",
    },
  },
};