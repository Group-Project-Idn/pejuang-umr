"use client";

import { useEffect } from "react";
import { playSfx, setMusicTrack, type BgmId, type SfxId } from "./sfx";

/** Bunyikan satu suara saat layar muncul. */
export function useSfxOnMount(id: SfxId): void {
  useEffect(() => playSfx(id), [id]);
}

/** Ganti trek musik selama layar terpasang; kembali ke musik lobi saat dilepas. */
export function useMusicTrack(track: BgmId): void {
  useEffect(() => {
    setMusicTrack(track);
    return () => setMusicTrack("bgm-lobby");
  }, [track]);
}
