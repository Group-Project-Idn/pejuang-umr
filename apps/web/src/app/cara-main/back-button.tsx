"use client";

import { useRouter } from "next/navigation";
import { consumeInternalNavigation, decideBackTarget } from "@/lib/back-target";

export function BackButton() {
  const router = useRouter();
  function goBack() {
    const target = decideBackTarget({
      cameFromApp: consumeInternalNavigation(),
      historyLength: window.history.length,
    });
    if (target === "history") router.back();
    else router.push("/");
  }
  return (
    <button
      type="button"
      onClick={goBack}
      className="lobby-comic-btn w-fit rounded-lg bg-[#8bd450] px-4 py-2 font-bold text-[#2d5a12]"
    >
      ← Kembali
    </button>
  );
}
