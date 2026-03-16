"use client";

export default function DonateCard() {
  const handleDonate = () => {
    window.open("https://toon.at/donate/hungrydev", "_blank", "noopener,noreferrer");
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            무료 프로그램 후원
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            본 프로그램은 무료 프로그램입니다.
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
  );
}