"use client";

import { createBoard, hexKey } from "@pejuang/shared";
import type { PublicGameState, RoomState, TileOption } from "@pejuang/shared";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
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
import { canZoomBoard, stepBoardDistance, type BoardZoomDirection } from "@/lib/board-camera";
import GameCharacters from "./GameCharacters";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
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
}: {
  game: PublicGameState;
  lit: readonly TileOption[];
  reveal: BoardReveal | null;
  onSelectHex: (key: string) => void;
  pointerDown: MutableRefObject<{ x: number; y: number } | null>;
  onLitRendered: (count: number) => void;
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
      const color = goldKey === key
        ? TILE_DETAILS.gold.color
        : opened
          ? TILE_DETAILS[opened.category].color
          : FOG_HIDDEN_COLOR;
      surface.setColorAt(index, tempColor.set(color));
    });
    outline.instanceMatrix.needsUpdate = true;
    surface.instanceMatrix.needsUpdate = true;
    if (outline.instanceColor) outline.instanceColor.needsUpdate = true;
    if (surface.instanceColor) surface.instanceColor.needsUpdate = true;
  }, [board, goldKey, litByHex, openedByHex, revealActiveKey]);


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
            pointerEvents="none"
            style={{ pointerEvents: "none" }}
          >
            <span className="tile-plan-label">
              {option.isGold ? "✦ " : ""}{option.title}
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
            pointerEvents="none"
            style={{ pointerEvents: "none" }}
          >
            <span className={`tile-symbol tile-symbol-${tile.category}`}>
              {TILE_DETAILS[tile.category].icon}
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
}: {
  game: PublicGameState;
  room: RoomState;
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
      <HexTiles game={game} lit={lit} reveal={reveal} onSelectHex={onSelectHex} pointerDown={pointerDown} onLitRendered={onLitRendered} />
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
        className="board-canvas"
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
