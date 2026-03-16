"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseAdmin"; 

export default function AdminStudioPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // 1. 작업 중 로딩 상태 (모션)
  const [isWorking, setIsWorking] = useState(false); 
  const [isPromptExtracting, setIsPromptExtracting] = useState(false); 
  const [isWhiskWorking, setIsWhiskWorking] = useState(false); 
  const [isTTSWorking, setIsTTSWorking] = useState(false); 
  const [isRendering, setIsRendering] = useState(false); 

  // 2. 입력 및 결과 데이터
  const [title, setTitle] = useState("");
  const [finalScript, setFinalScript] = useState(""); 
  const [customPrompt, setCustomPrompt] = useState(""); 
  const [imageUrls, setImageUrls] = useState<string[]>([]); 
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState(""); 

  // 3. [문제 1/4/5 해결] 설정값 스테이트
  const [selectedTheme, setSelectedTheme] = useState("괴담 👻");
  const [selectedDuration, setSelectedDuration] = useState("60초");
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [subtitleStyle, setSubtitleStyle] = useState({ fontSize: "24", color: "#ffffff", position: "bottom" });

  useEffect(() => {
    const init = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) router.push("/login");
        else setUser(session.user);
      } else { setUser({ email: "admin@jstudio.ai" }); }
    };
    init();
  }, [router]);

  // [단계 1] 대본 생성 (시간, 카테고리 포함)
  const handleGenerate = async () => {
    if (!title) return alert("주제를 입력하세요.");
    setIsWorking(true);
    try {
      const res = await fetch("/api/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: title, category: selectedTheme, duration: selectedDuration }),
      });
      const data = await res.json();
      setFinalScript(data.scripts?.[0]?.text || "");
    } finally { setIsWorking(false); }
  };

  // [단계 2] 프롬프트 10개 추출 (문제 2 해결)
  const handleExtractPrompt = async () => {
    if (!finalScript) return alert("대본이 필요합니다.");
    setIsPromptExtracting(true);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: finalScript, engine: "prompt" }),
      });
      const data = await res.json();
      setCustomPrompt(data.extractedPrompt || "");
    } finally { setIsPromptExtracting(false); }
  };

  // [단계 3] 이미지 10장 동시 생성 (문제 3 해결)
  const handleMakeImageWhisk = async () => {
    if (!customPrompt) return alert("프롬프트가 필요합니다.");
    setIsWhiskWorking(true);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt, engine: "whisk" }),
      });
      const data = await res.json();
      if (data.imageUrls) setImageUrls(data.imageUrls);
    } finally { setIsWhiskWorking(false); }
  };

  // [단계 4] TTS 생성 (문제 5 해결)
  const handleMakeTTS = async () => {
    setIsTTSWorking(true);
    try {
      const res = await fetch("/api/tts/make", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalScript, voice: selectedVoice }),
      });
      const data = await res.json();
      setAudioUrl(data.url || "");
    } finally { setIsTTSWorking(false); }
  };

  // [단계 5] 최종 영상 렌더링 (문제 4 해결)
  const handleRenderVideo = async () => {
    if (imageUrls.length === 0 || !audioUrl) return alert("이미지와 음성이 필요합니다.");
    setIsRendering(true);
    try {
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          images: imageUrls, 
          audio: audioUrl, 
          title, 
          script: finalScript, 
          style: subtitleStyle 
        }),
      });
      const data = await res.json();
      setVideoUrl(data.videoUrl || "");
    } finally { setIsRendering(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6 relative font-sans">
      {/* 전역 로딩 오버레이 */}
      {isRendering && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 font-black italic text-orange-600 animate-pulse text-xl">RENDERING FINAL SHORTS...</p>
        </div>
      )}

      <div className="max-w-[1500px] mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <h1 className="text-3xl font-black italic text-orange-500 tracking-tighter">J-STUDIO ADMIN</h1>
          <div className="flex gap-4">
            {/* 문제 1: 카테고리/시간 설정 */}
            <select className="bg-zinc-900 border border-zinc-700 text-xs p-2 rounded" value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)}>
              <option>괴담 👻</option><option>쿠팡쇼츠 🛒</option><option>카페 ☕</option>
            </select>
            <select className="bg-zinc-900 border border-zinc-700 text-xs p-2 rounded" value={selectedDuration} onChange={(e) => setSelectedDuration(e.target.value)}>
              <option>30초</option><option>60초</option><option>2분</option><option>3분</option><option>5분</option>
            </select>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7 space-y-6">
            <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <input className="w-full bg-black border border-zinc-800 p-3 rounded mb-4 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="주제를 입력하세요" />
              <textarea className="w-full h-80 bg-black border border-zinc-800 p-4 rounded text-sm" value={finalScript} onChange={(e) => setFinalScript(e.target.value)} />
              <button onClick={handleGenerate} disabled={isWorking} className="w-full py-3 bg-orange-600 mt-4 rounded font-bold uppercase text-xs">
                {isWorking ? "대본 생성 중..." : "1. 대본 생성"}
              </button>
            </section>

            <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <button onClick={handleExtractPrompt} disabled={isPromptExtracting} className="w-full py-3 bg-green-700 rounded font-bold uppercase text-xs mb-4">
                {isPromptExtracting ? "추출 중..." : "2. 프롬프트 10개 추출"}
              </button>
              <textarea className="w-full h-40 bg-black border border-zinc-800 p-4 rounded text-xs font-mono text-green-500" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
            </section>
          </div>

          <div className="col-span-5 space-y-6">
            <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between mb-4 items-center">
                <h3 className="text-xs font-bold text-orange-500 uppercase">Previews</h3>
                <button onClick={handleMakeImageWhisk} disabled={isWhiskWorking} className="bg-orange-600 px-4 py-1 rounded text-[10px] font-bold">
                  {isWhiskWorking ? "생성 중..." : "3. 이미지 10장 생성"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 h-72 overflow-y-auto scrollbar-hide bg-black/30 p-2 rounded">
                {imageUrls.map((url, i) => <img key={i} src={url} className="aspect-[9/16] object-cover rounded border border-zinc-800" />)}
              </div>
            </section>

            <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 문제 4: 자막 설정 */}
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase mb-1">Subtitle Size</p>
                  <input type="number" className="w-full bg-black border border-zinc-800 p-2 rounded text-xs" value={subtitleStyle.fontSize} onChange={(e) => setSubtitleStyle({...subtitleStyle, fontSize: e.target.value})} />
                </div>
                {/* 문제 5: 목소리 설정 */}
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase mb-1">TTS Voice</p>
                  <select className="w-full bg-black border border-zinc-800 p-2 rounded text-xs" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
                    <option value="nova">Nova (여성)</option><option value="onyx">Onyx (남성)</option>
                    <option value="echo">Echo</option><option value="shimmer">Shimmer</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleMakeTTS} disabled={isTTSWorking} className="flex-1 py-3 bg-zinc-700 rounded text-[10px] font-bold uppercase">
                  {isTTSWorking ? "생성 중..." : "4. TTS 생성"}
                </button>
                <button onClick={handleRenderVideo} disabled={isRendering || imageUrls.length === 0} className="flex-1 py-3 bg-red-700 rounded text-[10px] font-bold uppercase">
                  {isRendering ? "렌더링 중..." : "5. 영상 제작"}
                </button>
              </div>
              {videoUrl && (
                <div className="mt-4 p-4 border border-green-600 bg-black rounded-xl">
                  <video controls src={videoUrl} className="w-full aspect-[9/16]" />
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}