"use client";

import { useEffect } from "react";
import { startSfx } from "@/lib/sfx";

/** Memasang pemuat suara sekali untuk seluruh aplikasi; tidak merender apa pun. */
export function SfxProvider() {
  useEffect(() => startSfx(), []);
  return null;
}
