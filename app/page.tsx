"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

type ImageSlot = {
  id: number;
  finalInput: string;
  url: string;
  selected: boolean;
  isLoading: boolean;
  error?: string;
};

export default function AdminStudioPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const [isPromptExtracting, setIsPromptExtracting] = useState(false);
  const [isWhiskWorking, setIsWhiskWorking] = useState(false);
  const [isTTSWorking, setIsTTSWorking] = useState(false);

  const [finalScript, setFinalScript] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const [images, setImages] = useState<ImageSlot[]>([]);
  const [audioUrl, setAudioUrl] = useState("");

  const [selectedTheme, setSelectedTheme] = useState("제품/광고 🛒");
  const themes = [
    "제품/광고 🛒",
    "괴담/공포 👻",
    "카페/감성 ☕",
    "뉴스/정보 📰",
    "동화/스토리북 📚",
    "캐릭터/일러스트 🎨",
  ];

  const [selectedVoice, setSelectedVoice] = useState("nova");

  const [apiProvider, setApiProvider] = useState("google");
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");

  const [selectedGoogleModel, setSelectedGoogleModel] = useState(
    "gemini-3.1-flash-image-preview"
  );
  const [selectedOpenAIModel, setSelectedOpenAIModel] = useState("gpt-image-1");

  const [promptCount, setPromptCount] = useState("5");
  const [selectedStylePreset, setSelectedStylePreset] = useState("하이퍼리얼리즘");

  const googleModels = useMemo(
    () => [
      {
        group: "이미지 생성",
        items: [
          "gemini-3.1-flash-image-preview",
          "gemini-3-pro-image-preview",
          "gemini-2.5-flash-image",
        ],
      },
      {
        group: "텍스트/프롬프트 생성",
        items: ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
      },
    ],
    []
  );

  const openaiModels = useMemo(
    () => [
      {
        group: "이미지 생성",
        items: ["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"],
      },
      {
        group: "텍스트/프롬프트 생성",
        items: ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"],
      },
    ],
    []
  );

  const stylePresets = [
    "하이퍼리얼리즘",
    "동화풍",
    "캐릭터풍",
    "애니풍",
    "웹툰풍",
    "시네마틱",
    "제품광고풍",
    "감성풍",
    "공포풍",
  ];

  const activeApiKey = apiProvider === "google" ? googleApiKey : openaiApiKey;
  const activeModel =
    apiProvider === "google" ? selectedGoogleModel : selectedOpenAIModel;

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
        } else {
          setUser(session.user);
        }
      } catch (e) {
        console.error("세션 확인 오류:", e);
        setUser({ email: "admin@jstudio.ai" });
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    const savedProvider = localStorage.getItem("jstudio_api_provider") || "google";
    const savedGoogleApiKey =
      localStorage.getItem("jstudio_google_api_key") || "";
    const savedOpenaiApiKey =
      localStorage.getItem("jstudio_openai_api_key") || "";
    const savedGoogleModel =
      localStorage.getItem("jstudio_google_model") ||
      "gemini-3.1-flash-image-preview";
    const savedOpenaiModel =
      localStorage.getItem("jstudio_openai_model") || "gpt-image-1";
    const savedPromptCount =
      localStorage.getItem("jstudio_prompt_count") || "5";
    const savedStylePreset =
      localStorage.getItem("jstudio_style_preset") || "하이퍼리얼리즘";

    setApiProvider(savedProvider);
    setGoogleApiKey(savedGoogleApiKey);
    setOpenaiApiKey(savedOpenaiApiKey);
    setSelectedGoogleModel(savedGoogleModel);
    setSelectedOpenAIModel(savedOpenaiModel);
    setPromptCount(savedPromptCount);
    setSelectedStylePreset(savedStylePreset);
  }, []);

  const handleSaveLocalSettings = () => {
    localStorage.setItem("jstudio_api_provider", apiProvider);
    localStorage.setItem("jstudio_google_api_key", googleApiKey);
    localStorage.setItem("jstudio_openai_api_key", openaiApiKey);
    localStorage.setItem("jstudio_google_model", selectedGoogleModel);
    localStorage.setItem("jstudio_openai_model", selectedOpenAIModel);
    localStorage.setItem("jstudio_prompt_count", promptCount);
    localStorage.setItem("jstudio_style_preset", selectedStylePreset);
    alert("설정이 이 브라우저에 저장되었습니다.");
  };

  const handleDonate = () => {
    // 🌟 요청하신 hungrydev 주소로 다시 변경 완료했습니다.
    window.open("https://toon.at/donate/hungrydev", "_blank", "noopener,noreferrer");
  };

  const getCleanScriptLines = () => {
    if (!finalScript) return [];
    return finalScript
      .split("\n")
      .map((line) => line.replace(/\(.*\)/g, "").trim())
      .filter((line) => line.length > 0);
  };

  const handleExtractPrompt = async () => {
    if (!finalScript.trim()) {
      alert("대본을 먼저 입력해주세요.");
      return;
    }

    if (!activeApiKey.trim()) {
      alert("API Key를 먼저 입력하세요.");
      return;
    }

    setIsPromptExtracting(true);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: finalScript,
          engine: "prompt",
          category: selectedTheme,
          stylePreset: selectedStylePreset,
          promptCount: Number(promptCount),
          provider: apiProvider,
          model: activeModel,
          userApiKey: activeApiKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "프롬프트 추출 실패");
      }

      const extractedPromptText = data.extractedPrompt || "";
      setCustomPrompt(extractedPromptText);

      const promptArray = extractedPromptText
        .split("\n")
        .filter(
          (line: string) =>
            line.trim().match(/^\d+\./) || line.trim().length > 10
        )
        .map((line: string) => line.replace(/^\d+\.\s*/, "").trim())
        .slice(0, Number(promptCount));

      const initialSlots: ImageSlot[] = promptArray.map(
        (prompt: string, index: number) => ({
          id: index + 1,
          finalInput: prompt,
          url: "",
          selected: true,
          isLoading: false,
          error: "",
        })
      );

      setImages(initialSlots);
    } catch (error: any) {
      console.error("프롬프트 추출 오류:", error);
      alert(error.message || "프롬프트 추출 중 오류가 발생했습니다.");
    } finally {
      setIsPromptExtracting(false);
    }
  };

  const handleRegenerateSingle = async (id: number) => {
    const target = images.find((img) => img.id === id);

    if (!target || !target.finalInput.trim()) {
      alert("프롬프트 내용이 없습니다.");
      return;
    }

    if (!activeApiKey.trim()) {
      alert("API Key를 먼저 입력하세요.");
      return;
    }

    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, isLoading: true, error: "" } : img
      )
    );

    try {
      if (target.finalInput.trim().startsWith("data:image/")) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? {
                  ...img,
                  url: target.finalInput.trim(),
                  isLoading: false,
                  error: "",
                }
              : img
          )
        );
        return;
      }

      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customPrompt: target.finalInput,
          engine: "whisk",
          provider: apiProvider,
          model: activeModel,
          userApiKey: activeApiKey,
          stylePreset: selectedStylePreset,
          promptCount: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "이미지 생성 실패");
      }

      const newUrl = data.imageUrls?.[0] || "";
      const newError = data.errors?.[0] || "";

      if (!newUrl) {
        throw new Error(newError || "이미지 데이터가 비어 있습니다.");
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? {
                ...img,
                url: newUrl,
                isLoading: false,
                error: newError || "",
              }
            : img
        )
      );
    } catch (err: any) {
      console.error("단일 이미지 생성 오류:", err);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? {
                ...img,
                isLoading: false,
                error: err.message || "이미지 생성 실패",
              }
            : img
        )
      );
    }
  };

  const runWithConcurrency = async (ids: number[], limit: number) => {
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < ids.length) {
        const id = ids[currentIndex];
        currentIndex += 1;
        await handleRegenerateSingle(id);
      }
    };

    const workerCount = Math.min(limit, ids.length);
    await Promise.all(
      Array.from({ length: workerCount }, () => worker())
    );
  };

  const handleMakeAllImages = async () => {
    const targets = images.filter((img) => img.selected);

    if (targets.length === 0) {
      alert("선택된 이미지가 없습니다.");
      return;
    }

    if (!activeApiKey.trim()) {
      alert("API Key를 먼저 입력하세요.");
      return;
    }

    setIsWhiskWorking(true);
    try {
      const ids = targets.map((item) => item.id);
      await runWithConcurrency(ids, 3);
    } finally {
      setIsWhiskWorking(false);
    }
  };

  const handleMakeTTS = async () => {
    if (!finalScript.trim()) {
      alert("대본이 비어있습니다.");
      return;
    }

    setIsTTSWorking(true);
    try {
      const res = await fetch("/api/tts/make", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: finalScript,
          voice: selectedVoice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "TTS 생성 실패");
      }

      setAudioUrl(data.url || "");
    } catch (error: any) {
      console.error("TTS 생성 오류:", error);
      alert(error.message || "TTS 생성 중 오류가 발생했습니다.");
    } finally {
      setIsTTSWorking(false);
    }
  };

  const handleInputPathChange = (id: number, newValue: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, finalInput: newValue } : img
      )
    );
  };

  const handleToggleImageSelected = (id: number) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const handleDownloadImage = async (url: string, index: number) => {
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = `jstudio-image-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      alert(`이미지 다운로드 실패: ${error.message}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-600 font-semibold">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  J-STUDIO Free Creator Tool
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Google API와 GPT API를 모두 사용할 수 있는 무료 배포형
                  대본 기반 이미지 생성 툴
                </p>
              </div>

              <button
                type="button"
                onClick={handleDonate}
                className="px-5 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
              >
                후원하기
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                본 프로그램은 무료프로그램입니다. 서버비, 개발비, 유지비용,
                업데이트 모두 여러분의 후원으로 운영됩니다.
              </p>
              <button
                type="button"
                onClick={handleDonate}
                className="mt-3 text-sm font-semibold text-violet-700 hover:text-violet-800"
              >
                투네이션으로 응원하기
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">
                AI 사용 설정
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    API 제공사
                  </p>
                  <select
                    value={apiProvider}
                    onChange={(e) => setApiProvider(e.target.value)}
                    className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  >
                    <option value="google">Google AI Studio</option>
                    <option value="openai">OpenAI GPT</option>
                  </select>
                </div>

                {apiProvider === "google" ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      Google API Key
                    </p>
                    <input
                      type="password"
                      value={googleApiKey}
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      placeholder="여기에 Google API Key 입력"
                      className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      OpenAI API Key
                    </p>
                    <input
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="여기에 OpenAI API Key 입력"
                      className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    사용할 모델
                  </p>

                  {apiProvider === "google" ? (
                    <select
                      value={selectedGoogleModel}
                      onChange={(e) => setSelectedGoogleModel(e.target.value)}
                      className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"
                    >
                      {googleModels.map((group) => (
                        <optgroup key={group.group} label={group.group}>
                          {group.items.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={selectedOpenAIModel}
                      onChange={(e) => setSelectedOpenAIModel(e.target.value)}
                      className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"
                    >
                      {openaiModels.map((group) => (
                        <optgroup key={group.group} label={group.group}>
                          {group.items.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  onClick={handleSaveLocalSettings}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                >
                  설정 저장
                </button>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">
                생성 옵션
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    카테고리
                  </p>
                  <select
                    className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                  >
                    {themes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    스타일 프리셋
                  </p>
                  <select
                    className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"
                    value={selectedStylePreset}
                    onChange={(e) => setSelectedStylePreset(e.target.value)}
                  >
                    {stylePresets.map((style) => (
                      <option key={style}>{style}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    프롬프트 개수
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={promptCount}
                    onChange={(e) => setPromptCount(e.target.value)}
                    className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                대본 입력
              </h2>

              <textarea
                className="w-full h-[520px] bg-white border border-slate-300 p-4 rounded-xl text-sm outline-none resize-none focus:border-blue-500 leading-relaxed"
                value={finalScript}
                onChange={(e) => setFinalScript(e.target.value)}
                placeholder="여기에 직접 대본을 붙여넣으세요"
              />
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <button
                onClick={handleExtractPrompt}
                disabled={isPromptExtracting}
                className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                {isPromptExtracting
                  ? "프롬프트 추출 중..."
                  : "대본 분석 후 프롬프트 추출"}
              </button>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">
                  프롬프트 및 이미지 작업
                </h2>
                <button
                  onClick={handleMakeAllImages}
                  disabled={isWhiskWorking || images.length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isWhiskWorking ? "생성 중..." : "전체 이미지 생성"}
                </button>
              </div>

              <div className="space-y-4 h-[860px] overflow-y-auto pr-1">
                {images.length === 0 && (
                  <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center text-sm text-slate-400">
                    프롬프트를 추출하면 이 영역에 이미지 작업 카드가 표시됩니다.
                  </div>
                )}

                {images.map((img, index) => {
                  const scriptLines = getCleanScriptLines();
                  const matchedSubtitle = scriptLines[index] || "대본 없음";

                  return (
                    <div
                      key={img.id}
                      className={`grid grid-cols-12 gap-4 rounded-2xl border p-4 transition-all ${
                        img.selected
                          ? "border-blue-300 bg-blue-50/40"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="col-span-4">
                        <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                          {img.isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                          ) : img.url ? (
                            <img
                              src={img.url}
                              alt={`image-${img.id}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                              이미지 없음
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-span-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <span className="text-xs font-semibold text-slate-500">
                              생성 프롬프트
                            </span>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <button
                                onClick={() =>
                                  handleToggleImageSelected(img.id)
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                                  img.selected
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-600 border-slate-300"
                                }`}
                              >
                                {img.selected ? "선택됨" : "선택 해제"}
                              </button>

                              <button
                                onClick={() => handleRegenerateSingle(img.id)}
                                disabled={img.isLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              >
                                {img.isLoading ? "생성 중" : "다시 생성"}
                              </button>

                              {img.url && (
                                <button
                                  onClick={() =>
                                    handleDownloadImage(img.url, index)
                                  }
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                >
                                  다운로드
                                </button>
                              )}
                            </div>
                          </div>

                          <textarea
                            className="w-full h-24 bg-white border border-slate-300 p-3 rounded-xl text-xs text-slate-700 outline-none resize-none focus:border-blue-500"
                            value={img.finalInput}
                            onChange={(e) =>
                              handleInputPathChange(img.id, e.target.value)
                            }
                          />

                          {img.error ? (
                            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 whitespace-pre-wrap">
                              {img.error}
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold text-slate-500 mb-2">
                            연결된 대본
                          </p>
                          <span className="text-sm font-medium text-slate-800">
                            {matchedSubtitle}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-3 space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">
                음성 옵션
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    음성 선택
                  </p>
                  <select
                    className="w-full bg-white border border-slate-300 px-3 py-2 rounded-xl text-sm outline-none focus:border-blue-500"
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                  >
                    <option value="nova">Nova</option>
                    <option value="onyx">Onyx</option>
                  </select>
                </div>

                <button
                  onClick={handleMakeTTS}
                  disabled={isTTSWorking}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
                >
                  {isTTSWorking ? "생성 중" : "TTS 생성"}
                </button>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="space-y-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    무료 프로그램 후원
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    본 프로그램은 무료프로그램입니다.
                    <br />
                    서버비, 개발비, 유지비용, 업데이트 모두 여러분의 후원으로 운영됩니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDonate}
                  className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  후원하기
                </button>
              </div>
            </section>

            {audioUrl && (
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800 mb-3">
                  생성된 음성
                </h2>
                <audio controls src={audioUrl} className="w-full" />
              </section>
            )}

            {customPrompt && (
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800 mb-3">
                  추출된 프롬프트
                </h2>
                <textarea
                  readOnly
                  value={customPrompt}
                  className="w-full h-60 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700 outline-none resize-none"
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}