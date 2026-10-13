"use client";

import { createBoard, hexKey } from "@pejuang/shared";
import type { PublicGameState, RoomState, TileOption } from "@pejuang/shared";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, Suspense, type ComponentProps, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import * as THREE from "three";
import {
  getBoardDeskSize,
  HEX_TILE_RADIUS,
  hexToWorld,
  TILE_DETAILS,
} from "@/data/game";
import { isWebGLAvailable, NO_WEBGL_MESSAGE } from "@/lib/board-hud";
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
const LIT_COLOR = "#ffe9a8";
const LIT_OUTLINE_COLOR = "#ffd84d";

function HexTiles({
  game,
  lit,
  onSelectHex,
}: {
  game: PublicGameState;
  lit: readonly TileOption[];
  onSelectHex: (key: string) => void;
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
  const litByHex = useMemo(
    () => new Map(lit.map((option) => [hexKey(option.hex), option])),
    [lit],
  );

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
        tempColor.set(isLit ? LIT_OUTLINE_COLOR : HEX_TILE_OUTLINE_COLOR),
      );
      const color = isLit && !opened
        ? litByHex.get(key)?.isGold ? TILE_DETAILS.gold.color : LIT_COLOR
        : goldKey === key
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
  }, [board, goldKey, litByHex, openedByHex]);

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
          // Hanya klik/ketuk; heksa yang tidak menyala dan belum terbuka diabaikan.
          const hex = event.instanceId === undefined ? undefined : board[event.instanceId];
          if (!hex) return;
          const key = hexKey(hex);
          if (!litByHex.has(key) && !openedByHex.has(key)) return;
          event.stopPropagation();
          onSelectHex(key);
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
      {lit.map((option) => {
        const { x, z } = hexToWorld(option.hex.q, option.hex.r);
        return (
          <Html
            key={`lit-${hexKey(option.hex)}`}
            position={[x, 0.34, z]}
            center
            transform
            distanceFactor={10}
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
            style={{ pointerEvents: "none" }}
          >
            <span className={`tile-symbol tile-symbol-${tile.category}`}>
              {TILE_DETAILS[tile.category].icon}
            </span>
          </Html>
        );
      })}
    </>
  );
}

function DeskScene({
  game,
  room,
  lit,
  onSelectHex,
  inviteTargeting,
}: {
  game: PublicGameState;
  room: RoomState;
  lit: readonly TileOption[];
  onSelectHex: (key: string) => void;
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
      <HexTiles game={game} lit={lit} onSelectHex={onSelectHex} />
      <Suspense fallback={null}>
        <GameCharacters
          game={game}
          room={room}
          surfaceY={HEX_TILE_HEIGHT / 2 + HEX_TILE_SURFACE_OFFSET}
          inviteTargeting={inviteTargeting}
        />
      </Suspense>
      <OrbitControls
        enablePan={false}
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
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <BoardUnsupported /> : this.props.children;
  }
}

export default function GameBoard({
  game,
  room,
  lit,
  onSelectHex,
  inviteTargeting = null,
}: {
  game: PublicGameState;
  room: RoomState;
  /** Heksa menyala milik pemain aktif; kosong untuk pemain lain. */
  lit: readonly TileOption[];
  onSelectHex: (key: string) => void;
  inviteTargeting?: ComponentProps<typeof GameCharacters>["inviteTargeting"];
}) {
  const cameraDistance = 8 + game.boardRadius * 1.2;
  const webgl = useSyncExternalStore(subscribeNever, getWebglSupport, () => null);
  if (webgl === false) return <BoardUnsupported />;
  if (webgl === null) return <div className="board-canvas" aria-busy="true" />;
  return (
    <div className="board-canvas" aria-label="Papan permainan heksagonal 3D">
      <BoardErrorBoundary>
        <Canvas
          shadows
          dpr={[1, 1.6]}
          camera={{ position: [0, cameraDistance, cameraDistance * 0.84], fov: 42 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <DeskScene game={game} room={room} lit={lit} onSelectHex={onSelectHex} inviteTargeting={inviteTargeting} />
        </Canvas>
      </BoardErrorBoundary>
    </div>
  );
}
