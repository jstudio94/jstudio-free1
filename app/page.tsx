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

export default function HomePage() {
  // ✅ 게스트 모드 설정을 위해 기본 유저 상태를 부여합니다.
  const [user, setUser] = useState<any>({ email: "guest@jstudio.ai" });
  const router = useRouter();

  const [isPromptExtracting, setIsPromptExtracting] = useState(false);
  const [isWhiskWorking, setIsWhiskWorking] = useState(false);
  const [isTTSWorking, setIsTTSWorking] = useState(false);

  const [finalScript, setFinalScript] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [audioUrl, setAudioUrl] = useState("");

  const [selectedTheme, setSelectedTheme] = useState("제품/광고 🛒");
  const themes = ["제품/광고 🛒", "괴담/공포 👻", "카페/감성 ☕", "뉴스/정보 📰", "동화/스토리북 📚", "캐릭터/일러스트 🎨"];
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [apiProvider, setApiProvider] = useState("google");
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [selectedGoogleModel, setSelectedGoogleModel] = useState("gemini-3.1-flash-image-preview");
  const [selectedOpenAIModel, setSelectedOpenAIModel] = useState("gpt-image-1");
  const [promptCount, setPromptCount] = useState("5");
  const [selectedStylePreset, setSelectedStylePreset] = useState("하이퍼리얼리즘");

  const googleModels = useMemo(() => [
    { group: "이미지 생성", items: ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview", "gemini-2.5-flash-image"] },
    { group: "텍스트/프롬프트 생성", items: ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
  ], []);

  const openaiModels = useMemo(() => [
    { group: "이미지 생성", items: ["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"] },
    { group: "텍스트/프롬프트 생성", items: ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"] },
  ], []);

  const stylePresets = ["하이퍼리얼리즘", "동화풍", "캐릭터풍", "애니풍", "웹툰풍", "시네마틱", "제품광고풍", "감성풍", "공포풍"];

  const activeApiKey = apiProvider === "google" ? googleApiKey : openaiApiKey;
  const activeModel = apiProvider === "google" ? selectedGoogleModel : selectedOpenAIModel;

  // 로컬 스토리지 로드
  useEffect(() => {
    const savedProvider = localStorage.getItem("jstudio_api_provider") || "google";
    const savedGoogleApiKey = localStorage.getItem("jstudio_google_api_key") || "";
    const savedOpenaiApiKey = localStorage.getItem("jstudio_openai_api_key") || "";
    const savedGoogleModel = localStorage.getItem("jstudio_google_model") || "gemini-3.1-flash-image-preview";
    const savedOpenaiModel = localStorage.getItem("jstudio_openai_model") || "gpt-image-1";
    const savedPromptCount = localStorage.getItem("jstudio_prompt_count") || "5";
    const savedStylePreset = localStorage.getItem("jstudio_style_preset") || "하이퍼리얼리즘";

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
    window.open("https://toon.at/donate/hungrydev", "_blank", "noopener,noreferrer");
  };

  const getCleanScriptLines = () => {
    if (!finalScript) return [];
    return finalScript.split("\n").map((line) => line.replace(/\(.*\)/g, "").trim()).filter((line) => line.length > 0);
  };

  const handleExtractPrompt = async () => {
    if (!finalScript.trim() || !activeApiKey.trim()) return alert("대본과 API Key를 확인하세요.");
    setIsPromptExtracting(true);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: finalScript, engine: "prompt", category: selectedTheme, stylePreset: selectedStylePreset,
          promptCount: Number(promptCount), provider: apiProvider, model: activeModel, userApiKey: activeApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "추출 실패");
      setCustomPrompt(data.extractedPrompt || "");
      const promptArray = (data.extractedPrompt || "").split("\n").filter((line: string) => line.trim().length > 10).map((line: string) => line.replace(/^\d+\.\s*/, "").trim()).slice(0, Number(promptCount));
      setImages(promptArray.map((prompt: string, index: number) => ({ id: index + 1, finalInput: prompt, url: "", selected: true, isLoading: false })));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPromptExtracting(false);
    }
  };

  const handleRegenerateSingle = async (id: number) => {
    const target = images.find((img) => img.id === id);
    if (!target || !activeApiKey.trim()) return;
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, isLoading: true, error: "" } : img));
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt: target.finalInput, engine: "whisk", provider: apiProvider, model: activeModel, userApiKey: activeApiKey, stylePreset: selectedStylePreset, promptCount: 1 }),
      });
      const data = await res.json();
      setImages((prev) => prev.map((img) => img.id === id ? { ...img, url: data.imageUrls?.[0] || "", isLoading: false, error: data.errors?.[0] || "" } : img));
    } catch (err: any) {
      setImages((prev) => prev.map((img) => img.id === id ? { ...img, isLoading: false, error: err.message } : img));
    }
  };

  const handleMakeAllImages = async () => {
    const targets = images.filter((img) => img.selected);
    if (targets.length === 0) return alert("선택된 이미지가 없습니다.");
    setIsWhiskWorking(true);
    for (const img of targets) { await handleRegenerateSingle(img.id); }
    setIsWhiskWorking(false);
  };

  const handleMakeTTS = async () => {
    if (!finalScript.trim()) return alert("대본이 비어있습니다.");
    setIsTTSWorking(true);
    try {
      const res = await fetch("/api/tts/make", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: finalScript, voice: selectedVoice }) });
      const data = await res.json();
      setAudioUrl(data.url || "");
    } finally { setIsTTSWorking(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">J-STUDIO Free Creator Tool</h1>
                <p className="mt-1 text-sm text-slate-500">대본 기반 이미지 생성 툴 (게스트 모드)</p>
              </div>
              <button onClick={handleDonate} className="px-5 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">후원하기</button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* 1. 왼쪽 설정창 */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-4">AI 사용 설정</h2>
              <div className="space-y-4">
                <select value={apiProvider} onChange={(e) => setApiProvider(e.target.value)} className="w-full border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none">
                  <option value="google">Google AI Studio</option>
                  <option value="openai">OpenAI GPT</option>
                </select>
                <input type="password" value={activeApiKey} onChange={(e) => apiProvider === "google" ? setGoogleApiKey(e.target.value) : setOpenaiApiKey(e.target.value)} placeholder="API Key 입력" className="w-full border border-slate-300 px-4 py-3 rounded-xl text-sm outline-none" />
                <button onClick={handleSaveLocalSettings} className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">설정 저장</button>
              </div>
            </section>
            
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-4">대본 입력</h2>
              <textarea className="w-full h-[400px] border border-slate-300 p-4 rounded-xl text-sm outline-none resize-none leading-relaxed" value={finalScript} onChange={(e) => setFinalScript(e.target.value)} placeholder="대본을 입력하세요..." />
              <button onClick={handleExtractPrompt} disabled={isPromptExtracting} className="w-full mt-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
                {isPromptExtracting ? "추출 중..." : "프롬프트 추출"}
              </button>
            </section>
          </div>

          {/* 2. 중앙 이미지 작업창 */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">이미지 작업</h2>
                <button onClick={handleMakeAllImages} disabled={isWhiskWorking || images.length === 0} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm disabled:opacity-50">전체 이미지 생성</button>
              </div>
              <div className="space-y-4 h-[800px] overflow-y-auto">
                {images.map((img, index) => (
                  <div key={img.id} className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <div className="flex gap-4">
                      <div className="w-24 h-40 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                        {img.url ? <img src={img.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">No Image</div>}
                      </div>
                      <div className="flex-1">
                        <textarea className="w-full h-24 border border-slate-300 p-2 rounded-lg text-xs outline-none" value={img.finalInput} onChange={(e) => setImages(prev => prev.map(i => i.id === img.id ? {...i, finalInput: e.target.value} : i))} />
                        <button onClick={() => handleRegenerateSingle(img.id)} className="mt-2 text-xs font-semibold text-blue-600">이 장면만 생성</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 3. 오른쪽 음성 및 후원 */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-4">음성 및 후원</h2>
              <button onClick={handleMakeTTS} disabled={isTTSWorking} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm mb-4">TTS 생성</button>
              {audioUrl && <audio controls src={audioUrl} className="w-full" />}
              <div className="mt-6 p-4 bg-violet-50 rounded-xl border border-violet-100">
                <p className="text-xs text-violet-700 leading-relaxed">여러분의 소중한 후원이 J-STUDIO를 지속하게 합니다. ❤️</p>
                <button onClick={handleDonate} className="w-full mt-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold">후원하러 가기</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}