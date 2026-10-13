"use client";

import { createBoard, hexKey } from "@pejuang/shared";
import type { PublicGameState, RoomState, TileOption } from "@pejuang/shared";
import { Html, OrbitControls, RoundedBox, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Component, Suspense, type ComponentProps, type MutableRefObject, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import * as THREE from "three";
import {
  getBoardDeskSize,
  HEX_TILE_RADIUS,
  hexToWorld,
  TILE_DETAILS,
} from "@/data/game";
import { isWebGLAvailable, NO_WEBGL_MESSAGE } from "@/lib/board-hud";
import {
  isDragGesture,
  litInstanceToKey,
  shouldShowHexFallback,
} from "@/lib/hex-interaction";
import { OUTCOME_LABEL } from "@/lib/reveal";
import {
  buildWaveSchedule,
  OUTCOME_TILE_COLOR,
  ORIGIN_HOLD_MAX_MS,
  originMotion,
  rippleMotion,
  type TileMotion,
  type WaveSchedule,
} from "@/lib/board-wave";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { canZoomBoard, stepBoardDistance, type BoardZoomDirection } from "@/lib/board-camera";
import CategoryIcon from "./CategoryIcon";
import GameCharacters from "./GameCharacters";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
const tempQuat = new THREE.Quaternion();
const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
const flipAxis = new THREE.Vector3(1, 0, 0);
const tempScale = new THREE.Vector3(1, 1, 1);
const tempPosition = new THREE.Vector3();
const HEX_TILE_OUTLINE_RADIUS = HEX_TILE_RADIUS * 1.01;
const HEX_TILE_SURFACE_RADIUS = HEX_TILE_RADIUS * 0.96;
const HEX_TILE_ROTATION = Math.PI / 6;
const HEX_TILE_HEIGHT = 0.25;
const HEX_TILE_SURFACE_OFFSET = 0.02;
const HEX_TILE_OUTLINE_COLOR = "#111318";
const FOG_HIDDEN_COLOR = "#343941";
const LIT_COLOR = "#fff2a8";
const LIT_RING_RADIUS = HEX_TILE_SURFACE_RADIUS * 1.0;
const LIT_FILL_RADIUS = HEX_TILE_SURFACE_RADIUS * 0.8;
const LIT_RING_HEIGHT = 0.05;
const LIT_FILL_HEIGHT = 0.07;
const LIT_BASE_Y = HEX_TILE_HEIGHT / 2 + HEX_TILE_SURFACE_OFFSET;
const LIT_OUTLINE_COLOR = "#ffd84d";
const GOLD_GLOW_HEIGHT = 0.03;
const GOLD_GLOW_PULSE_MIN = 0.35;
const GOLD_GLOW_PULSE_MAX = 1.1;
const GOLD_GLOW_STATIC = 0.7;

type WaveAnimation = {
  startedAt: number;
  originKey: string;
  schedule: WaveSchedule;
  /** Warna tetap dipakai kembali setelah sisi berganti agar setColorAt hanya jalan saat menyeberang. */
  colorShown: Map<string, "public" | "reality">;
};

/** Warna istirahat heksa: Realita hanya bila sudah dibalik di Fase Pembalikan ini. */
function restTileColor(
  key: string,
  goldKey: string | null,
  opened: PublicGameState["openedHexes"][number] | undefined,
  flippedKeys: ReadonlySet<string> | null,
): string {
  if (goldKey === key) return TILE_DETAILS.gold.color;
  if (!opened) return FOG_HIDDEN_COLOR;
  if (flippedKeys?.has(key) && opened.reality) return OUTCOME_TILE_COLOR[opened.reality.outcome];
  return TILE_DETAILS[opened.category].color;
}

function publicTileColor(
  key: string,
  goldKey: string | null,
  opened: PublicGameState["openedHexes"][number] | undefined,
): string {
  return restTileColor(key, goldKey, opened, null);
}

/** Cahaya Petak Emas: kilau Sparkles dan denyut emissive; statis bila kurangi gerakan. */
function GoldGlow({ x, z, reducedMotion }: { x: number; z: number; reducedMotion: boolean }) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !material.current) return;
    const wave = (Math.sin(clock.elapsedTime * 3) + 1) / 2;
    material.current.emissiveIntensity = GOLD_GLOW_PULSE_MIN + (GOLD_GLOW_PULSE_MAX - GOLD_GLOW_PULSE_MIN) * wave;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, LIT_BASE_Y - 0.005 + GOLD_GLOW_HEIGHT / 2, 0]}
        rotation={[0, HEX_TILE_ROTATION, 0]}
        raycast={() => null}
      >
        <cylinderGeometry args={[HEX_TILE_SURFACE_RADIUS * 0.9, HEX_TILE_SURFACE_RADIUS * 0.9, GOLD_GLOW_HEIGHT, 6]} />
        <meshStandardMaterial
          ref={material}
          color={TILE_DETAILS.gold.color}
          emissive="#ffc933"
          emissiveIntensity={GOLD_GLOW_STATIC}
          roughness={0.5}
        />
      </mesh>
      {reducedMotion ? null : (
        <Sparkles
          count={14}
          scale={[HEX_TILE_RADIUS * 1.5, 0.9, HEX_TILE_RADIUS * 1.5]}
          position={[0, 0.55, 0]}
          size={5}
          speed={0.6}
          opacity={0.9}
          color="#fff0a0"
          noise={0.4}
        />
      )}
    </group>
  );
}

/** Posisi animasi Fase Pembalikan; null di luar fase itu. */
export type BoardReveal = {
  activeKey: string | null;
  flippedKeys: ReadonlySet<string>;
};

/**
 * Lapisan heksa menyala: instancedMesh sendiri dengan material tanpa pencahayaan
 * dan satu warna per mesh, tanpa instanceColor. Cincin kuning tebal di bawah isian.
 */
function LitLayer({
  options,
  color,
  onPick,
}: {
  options: readonly TileOption[];
  color: string;
  onPick: (event: ThreeEvent<MouseEvent>, key: string) => void;
}) {
  const ringMesh = useRef<THREE.InstancedMesh>(null);
  const fillMesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const ring = ringMesh.current;
    const fill = fillMesh.current;
    if (!ring || !fill) return;
    options.forEach((option, index) => {
      const { x, z } = hexToWorld(option.hex.q, option.hex.r);
      tempObject.position.set(x, LIT_BASE_Y + LIT_RING_HEIGHT / 2, z);
      tempObject.rotation.set(0, HEX_TILE_ROTATION, 0);
      tempObject.scale.setScalar(1);
      tempObject.updateMatrix();
      ring.setMatrixAt(index, tempObject.matrix);
      tempObject.position.y = LIT_BASE_Y + LIT_FILL_HEIGHT / 2;
      tempObject.updateMatrix();
      fill.setMatrixAt(index, tempObject.matrix);
    });
    ring.count = options.length;
    fill.count = options.length;
    ring.instanceMatrix.needsUpdate = true;
    fill.instanceMatrix.needsUpdate = true;
    // Bounding sphere bawaan dihitung dari instance awal; hitung ulang agar raycast akurat.
    ring.computeBoundingSphere();
    fill.computeBoundingSphere();
  }, [options]);
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    const key = litInstanceToKey(event.instanceId, options);
    if (key === null) return;
    event.stopPropagation();
    onPick(event, key);
  };
  const capacity = Math.max(options.length, 1);
  return (
    <>
      <instancedMesh
        key={`ring-${capacity}`}
        ref={ringMesh}
        args={[undefined, undefined, capacity]}
        frustumCulled={false}
        onClick={handleClick}
      >
        <cylinderGeometry args={[LIT_RING_RADIUS, LIT_RING_RADIUS, LIT_RING_HEIGHT, 6]} />
        <meshBasicMaterial color={LIT_OUTLINE_COLOR} toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        key={`fill-${capacity}`}
        ref={fillMesh}
        args={[undefined, undefined, capacity]}
        frustumCulled={false}
        onClick={handleClick}
      >
        <cylinderGeometry args={[LIT_FILL_RADIUS, LIT_FILL_RADIUS, LIT_FILL_HEIGHT, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function HexTiles({
  game,
  lit,
  reveal,
  onSelectHex,
  pointerDown,
  onLitRendered,
  onWaveActive,
  reducedMotion,
}: {
  game: PublicGameState;
  lit: readonly TileOption[];
  reveal: BoardReveal | null;
  onSelectHex: (key: string) => void;
  pointerDown: MutableRefObject<{ x: number; y: number } | null>;
  onLitRendered: (count: number) => void;
  onWaveActive: (active: boolean) => void;
  reducedMotion: boolean;
}) {
  const outlineMesh = useRef<THREE.InstancedMesh>(null);
  const surfaceMesh = useRef<THREE.InstancedMesh>(null);
  const board = useMemo(
    () => createBoard(game.boardRadius),
    [game.boardRadius],
  );
  const openedByHex = useMemo(
    () => new Map(game.openedHexes.map((tile) => [hexKey(tile.hex), tile])),
    [game.openedHexes],
  );
  const goldKey = game.gold ? hexKey(game.gold.hex) : null;
  const revealActiveKey = reveal?.activeKey ?? null;
  const revealFlipped = reveal?.flippedKeys ?? null;
  const waveRef = useRef<WaveAnimation | null>(null);
  const latest = useRef({ board, openedByHex, goldKey, revealFlipped });
  useEffect(() => {
    latest.current = { board, openedByHex, goldKey, revealFlipped };
  });
  const indexByKey = useMemo(
    () => new Map(board.map((hex, index) => [hexKey(hex), index])),
    [board],
  );
  const litByHex = useMemo(
    () => new Map(lit.map((option) => [hexKey(option.hex), option])),
    [lit],
  );
  const normalLit = useMemo(() => lit.filter((option) => !option.isGold), [lit]);
  const goldLit = useMemo(() => lit.filter((option) => option.isGold), [lit]);
  // Klik yang berasal dari seretan kamera tidak dihitung klik heksa.
  const pick = (event: ThreeEvent<MouseEvent>, key: string) => {
    const { clientX: x, clientY: y } = event.nativeEvent;
    if (isDragGesture(pointerDown.current, { x, y })) return;
    onSelectHex(key);
  };

  // Hanya melapor setelah litMesh benar-benar punya instance yang tergambar.
  useEffect(() => {
    onLitRendered(lit.length);
    return () => onLitRendered(0);
  }, [lit, onLitRendered]);

  useEffect(() => {
    if (!outlineMesh.current || !surfaceMesh.current) return;
    const outline = outlineMesh.current;
    const surface = surfaceMesh.current;

    board.forEach((hex, index) => {
      const { x, z } = hexToWorld(hex.q, hex.r);
      const key = hexKey(hex);
      const opened = openedByHex.get(key);
      tempObject.position.set(x, 0, z);
      tempObject.rotation.set(0, HEX_TILE_ROTATION, 0);
      tempObject.scale.setScalar(1);
      tempObject.updateMatrix();
      outline.setMatrixAt(index, tempObject.matrix);
      tempObject.position.y = HEX_TILE_SURFACE_OFFSET;
      tempObject.updateMatrix();
      surface.setMatrixAt(index, tempObject.matrix);
      const isLit = litByHex.has(key);
      outline.setColorAt(
        index,
        tempColor.set(isLit || key === revealActiveKey ? LIT_OUTLINE_COLOR : HEX_TILE_OUTLINE_COLOR),
      );
      // Heksa ronde yang sedang dibalik memegang warnanya sendiri sampai animasinya selesai.
      const animating = waveRef.current?.originKey === key;
      surface.setColorAt(
        index,
        tempColor.set(animating
          ? publicTileColor(key, goldKey, opened)
          : restTileColor(key, goldKey, opened, revealFlipped)),
      );
    });
    outline.instanceMatrix.needsUpdate = true;
    surface.instanceMatrix.needsUpdate = true;
    if (outline.instanceColor) outline.instanceColor.needsUpdate = true;
    if (surface.instanceColor) surface.instanceColor.needsUpdate = true;
  }, [board, goldKey, litByHex, openedByHex, revealActiveKey, revealFlipped]);

  // Mulai gelombang saat heksa ronde berikutnya aktif. Kosmetik saja: waktu mulai
  // memakai jam lokal, hasil dan durasi tetap dari server.
  useEffect(() => {
    if (reducedMotion || !revealActiveKey) return;
    const originTile = game.openedHexes.find((tile) => hexKey(tile.hex) === revealActiveKey);
    if (!originTile) return;
    waveRef.current = {
      startedAt: performance.now(),
      originKey: revealActiveKey,
      schedule: buildWaveSchedule(originTile.hex, game.openedHexes.map((tile) => tile.hex)),
      colorShown: new Map(),
    };
    onWaveActive(true);
    // Hanya bereaksi pada pergantian heksa aktif, bukan setiap patch game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealActiveKey, reducedMotion]);

  useEffect(() => () => onWaveActive(false), [onWaveActive]);

  // Satu controller bersama untuk semua heksa; tidak melakukan apa pun di luar gelombang.
  useFrame(() => {
    const wave = waveRef.current;
    const outline = outlineMesh.current;
    const surface = surfaceMesh.current;
    if (!wave || !outline || !surface) return;
    const state = latest.current;
    const elapsed = performance.now() - wave.startedAt;
    const originReady = (() => {
      const opened = state.openedByHex.get(wave.originKey);
      return Boolean(opened?.reality) ||
        Boolean(state.revealFlipped?.has(wave.originKey)) ||
        elapsed > ORIGIN_HOLD_MAX_MS;
    })();
    let allDone = true;
    for (const entry of wave.schedule.entries) {
      const index = indexByKey.get(entry.key);
      if (index === undefined) continue;
      const hex = state.board[index];
      const motion: TileMotion = entry.kind === "origin"
        ? originMotion(elapsed, entry, originReady)
        : rippleMotion(elapsed, entry);
      if (!motion.done) allDone = false;
      const opened = state.openedByHex.get(entry.key);
      const { x, z } = hexToWorld(hex.q, hex.r);
      tempQuat.setFromAxisAngle(flipAxis, motion.angle).multiply(yawQuat);
      tempPosition.set(x, motion.lift, z);
      tempObject.matrix.compose(tempPosition, tempQuat, tempScale);
      outline.setMatrixAt(index, tempObject.matrix);
      tempPosition.y += HEX_TILE_SURFACE_OFFSET;
      tempObject.matrix.compose(tempPosition, tempQuat, tempScale);
      surface.setMatrixAt(index, tempObject.matrix);
      if (entry.kind === "origin") {
        const side = motion.showReality || motion.done ? "reality" : "public";
        if (wave.colorShown.get(entry.key) !== side) {
          wave.colorShown.set(entry.key, side);
          const color = side === "reality"
            ? restTileColor(entry.key, state.goldKey, opened, state.revealFlipped)
            : publicTileColor(entry.key, state.goldKey, opened);
          surface.setColorAt(index, tempColor.set(color));
          if (surface.instanceColor) surface.instanceColor.needsUpdate = true;
        }
      }
    }
    outline.instanceMatrix.needsUpdate = true;
    surface.instanceMatrix.needsUpdate = true;
    if (allDone) {
      waveRef.current = null;
      onWaveActive(false);
      // Selesai: letakkan semua entri di posisi istirahat dengan warna terkini.
      for (const entry of wave.schedule.entries) {
        const index = indexByKey.get(entry.key);
        if (index === undefined) continue;
        const hex = state.board[index];
        const { x, z } = hexToWorld(hex.q, hex.r);
        tempObject.position.set(x, 0, z);
        tempObject.rotation.set(0, HEX_TILE_ROTATION, 0);
        tempObject.scale.setScalar(1);
        tempObject.updateMatrix();
        outline.setMatrixAt(index, tempObject.matrix);
        tempObject.position.y = HEX_TILE_SURFACE_OFFSET;
        tempObject.updateMatrix();
        surface.setMatrixAt(index, tempObject.matrix);
        surface.setColorAt(
          index,
          tempColor.set(restTileColor(entry.key, state.goldKey, state.openedByHex.get(entry.key), state.revealFlipped)),
        );
      }
      outline.instanceMatrix.needsUpdate = true;
      surface.instanceMatrix.needsUpdate = true;
      if (surface.instanceColor) surface.instanceColor.needsUpdate = true;
    }
  });


  return (
    <>
      <instancedMesh
        ref={outlineMesh}
        args={[undefined, undefined, board.length]}
        receiveShadow
      >
        <cylinderGeometry
          args={[
            HEX_TILE_OUTLINE_RADIUS,
            HEX_TILE_OUTLINE_RADIUS,
            HEX_TILE_HEIGHT,
            6,
          ]}
        />
        <meshStandardMaterial roughness={0.9} metalness={0} />
      </instancedMesh>
      <instancedMesh
        ref={surfaceMesh}
        args={[undefined, undefined, board.length]}
        castShadow
        receiveShadow
        onClick={(event) => {
          // Hanya heksa terbuka; heksa menyala ditangani litMesh.
          const hex = event.instanceId === undefined ? undefined : board[event.instanceId];
          if (!hex) return;
          const key = hexKey(hex);
          if (!openedByHex.has(key)) return;
          event.stopPropagation();
          pick(event, key);
        }}
      >
        <cylinderGeometry
          args={[
            HEX_TILE_SURFACE_RADIUS,
            HEX_TILE_SURFACE_RADIUS,
            HEX_TILE_HEIGHT,
            6,
          ]}
        />
        <meshStandardMaterial roughness={0.72} metalness={0.05} />
      </instancedMesh>
      {game.gold ? (
        <GoldGlow
          key={goldKey}
          {...hexToWorld(game.gold.hex.q, game.gold.hex.r)}
          reducedMotion={reducedMotion}
        />
      ) : null}
      <LitLayer options={normalLit} color={LIT_COLOR} onPick={pick} />
      <LitLayer options={goldLit} color={TILE_DETAILS.gold.color} onPick={pick} />
      {lit.map((option) => {
        const { x, z } = hexToWorld(option.hex.q, option.hex.r);
        return (
          <Html
            key={`lit-${hexKey(option.hex)}`}
            position={[x, 0.34, z]}
            center
            transform
            distanceFactor={10}
            zIndexRange={[0, 0]}
            pointerEvents="none"
            style={{ pointerEvents: "none" }}
          >
            <span className="tile-icon tile-icon-lit">
              <CategoryIcon category={option.isGold ? "gold" : option.category} size={34} />
            </span>
          </Html>
        );
      })}
      {game.openedHexes.map((tile) => {
        const { x, z } = hexToWorld(tile.hex.q, tile.hex.r);
        return (
          <Html
            key={hexKey(tile.hex)}
            position={[x, 0.34, z]}
            center
            transform
            distanceFactor={10}
            zIndexRange={[0, 0]}
            pointerEvents="none"
            style={{ pointerEvents: "none" }}
          >
            <span className="tile-icon tile-icon-open">
              <CategoryIcon category={tile.category} size={30} />
            </span>
            {reveal && tile.reality && reveal.flippedKeys.has(hexKey(tile.hex)) ? (
              <span className={`tile-outcome tile-outcome-${tile.reality.outcome}`}>
                {OUTCOME_LABEL[tile.reality.outcome]}
              </span>
            ) : null}
          </Html>
        );
      })}
    </>
  );
}

type OrbitControlsImpl = NonNullable<ComponentProps<typeof OrbitControls>["ref"] extends infer R ? R extends { current: infer C } ? C : never : never>;

function DeskScene({
  game,
  room,
  lit,
  reveal,
  onSelectHex,
  inviteTargeting,
  pointerDown,
  onLitRendered,
  controlsRef,
  onDistanceChange,
  onWaveActive,
  reducedMotion,
}: {
  game: PublicGameState;
  room: RoomState;
  onWaveActive: (active: boolean) => void;
  reducedMotion: boolean;
  lit: readonly TileOption[];
  reveal: BoardReveal | null;
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  onDistanceChange: (distance: number) => void;
  onSelectHex: (key: string) => void;
  pointerDown: MutableRefObject<{ x: number; y: number } | null>;
  onLitRendered: (count: number) => void;
  inviteTargeting: ComponentProps<typeof GameCharacters>["inviteTargeting"];
}) {
  const board = useMemo(
    () => createBoard(game.boardRadius),
    [game.boardRadius],
  );
  const desk = useMemo(() => getBoardDeskSize(board), [board]);
  return (
    <>
      <color attach="background" args={["#8f4f2f"]} />
      <fog attach="fog" args={["#8f4f2f", 16, 30]} />
      <ambientLight intensity={1.5} />
      <directionalLight
        position={[-4, 9, 5]}
        intensity={2.8}
        color="#fff2d0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        position={[5, 5, -4]}
        intensity={16}
        color="#ffc25c"
        distance={18}
      />
      <RoundedBox
        args={[desk.width, 0.35, desk.depth]}
        radius={0.24}
        smoothness={4}
        position={[0, -0.36, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#61331f" roughness={0.86} />
      </RoundedBox>
      <HexTiles game={game} lit={lit} reveal={reveal} onSelectHex={onSelectHex} pointerDown={pointerDown} onLitRendered={onLitRendered} onWaveActive={onWaveActive} reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <GameCharacters
          game={game}
          room={room}
          surfaceY={HEX_TILE_HEIGHT / 2 + HEX_TILE_SURFACE_OFFSET}
          inviteTargeting={inviteTargeting}
        />
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        enableDamping={false}
        onChange={() => {
          const controls = controlsRef.current;
          if (controls) onDistanceChange(controls.getDistance());
        }}
        minPolarAngle={0.45}
        maxPolarAngle={1.15}
        minDistance={10}
        maxDistance={22}
        target={[0, 0, 0]}
      />
    </>
  );
}

let webglSupport: boolean | null = null;
function getWebglSupport(): boolean {
  webglSupport ??= isWebGLAvailable();
  return webglSupport;
}
const subscribeNever = () => () => {};

function BoardUnsupported() {
  return (
    <div className="board-canvas board-canvas-empty" role="alert">
      <p className="board-unsupported">{NO_WEBGL_MESSAGE}</p>
    </div>
  );
}

/** Canvas yang gagal dibuat (mis. konteks WebGL hilang) menampilkan pesan yang sama. */
class BoardErrorBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? <BoardUnsupported /> : this.props.children;
  }
}

export default function GameBoard({
  game,
  room,
  lit,
  reveal = null,
  onSelectHex,
  inviteTargeting = null,
}: {
  game: PublicGameState;
  room: RoomState;
  /** Heksa menyala milik pemain aktif; kosong untuk pemain lain. */
  lit: readonly TileOption[];
  reveal?: BoardReveal | null;
  onSelectHex: (key: string) => void;
  inviteTargeting?: ComponentProps<typeof GameCharacters>["inviteTargeting"];
}) {
  const cameraDistance = 8 + game.boardRadius * 1.2;
  const webgl = useSyncExternalStore(subscribeNever, getWebglSupport, () => null);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const [renderedLitCount, setRenderedLitCount] = useState(0);
  const [boardReady, setBoardReady] = useState(false);
  const [boardFailed, setBoardFailed] = useState(false);
  const [waveActive, setWaveActive] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const zoomBoard = (direction: BoardZoomDirection) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const next = stepBoardDistance(controls.getDistance(), direction);
    const offset = controls.object.position.clone().sub(controls.target);
    controls.object.position.copy(offset.setLength(next).add(controls.target));
    controls.update();
    setDistance(next);
  };
  if (webgl === false) return <BoardUnsupported />;
  if (webgl === null) return <div className="board-canvas" aria-busy="true" />;
  const showFallback = shouldShowHexFallback({
    webgl,
    boardReady,
    boardFailed,
    litCount: lit.length,
    renderedLitCount,
  });
  return (
    <>
      <div
        className={waveActive ? "board-canvas board-wave" : "board-canvas"}
        aria-label="Papan permainan heksagonal 3D"
        onPointerDownCapture={(event) => {
          pointerDown.current = { x: event.clientX, y: event.clientY };
        }}
      >
        <BoardErrorBoundary onFail={() => setBoardFailed(true)}>
          <Canvas
            shadows
            dpr={[1, 1.6]}
            camera={{ position: [0, cameraDistance, cameraDistance * 0.84], fov: 42 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={() => setBoardReady(true)}
          >
            <DeskScene
              game={game}
              room={room}
              lit={lit}
              reveal={reveal}
              onSelectHex={onSelectHex}
              inviteTargeting={inviteTargeting}
              pointerDown={pointerDown}
              onLitRendered={setRenderedLitCount}
              controlsRef={controlsRef}
              onDistanceChange={setDistance}
              onWaveActive={setWaveActive}
              reducedMotion={reducedMotion}
            />
          </Canvas>
        </BoardErrorBoundary>
      </div>
      <div className="board-zoom">
        <button
          type="button"
          aria-label="Perbesar papan"
          disabled={distance !== null && !canZoomBoard(distance, "in")}
          onClick={() => zoomBoard("in")}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Perkecil papan"
          disabled={distance !== null && !canZoomBoard(distance, "out")}
          onClick={() => zoomBoard("out")}
        >
          −
        </button>
      </div>
      {showFallback ? (
        <ul className="hex-fallback" aria-label="Daftar heksa menyala">
          {lit.map((option) => (
            <li key={hexKey(option.hex)}>
              <button type="button" onClick={() => onSelectHex(hexKey(option.hex))}>
                {option.isGold ? "✦ " : ""}{option.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
