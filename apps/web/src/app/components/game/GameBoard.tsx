"use client";

import { createBoard, hexKey } from "@pejuang/shared";
import type { PublicGameState, RoomState } from "@pejuang/shared";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  getBoardDeskSize,
  HEX_TILE_RADIUS,
  hexToWorld,
  TILE_DETAILS,
} from "@/data/game";
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
const DEAD_TILE_COLOR = "#231f20";

function HexTiles({ game }: { game: PublicGameState }) {
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
  const deadHexes = useMemo(
    () => new Set(game.deadHexes.map(hexKey)),
    [game.deadHexes],
  );
  const goldKey = game.gold ? hexKey(game.gold.hex) : null;

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
      outline.setColorAt(index, tempColor.set(HEX_TILE_OUTLINE_COLOR));
      const color = deadHexes.has(key)
        ? DEAD_TILE_COLOR
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
  }, [board, deadHexes, goldKey, openedByHex]);

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
}: {
  game: PublicGameState;
  room: RoomState;
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
      <HexTiles game={game} />
      <Suspense fallback={null}>
        <GameCharacters
          game={game}
          room={room}
          surfaceY={HEX_TILE_HEIGHT / 2 + HEX_TILE_SURFACE_OFFSET}
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

export default function GameBoard({
  game,
  room,
}: {
  game: PublicGameState;
  room: RoomState;
}) {
  const cameraDistance = 8 + game.boardRadius * 1.2;
  return (
    <div className="board-canvas" aria-label="Papan permainan heksagonal 3D">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0, cameraDistance, cameraDistance * 0.84], fov: 42 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <DeskScene game={game} room={room} />
      </Canvas>
    </div>
  );
}
