"use client";

import { createBoard, hexKey } from "@pejuang/shared";
import type { PublicGameState, RoomState } from "@pejuang/shared";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  getBoardDeskSize,
  getBoardZoom,
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

function BoardCamera({ radius }: { radius: number }) {
  const { get, size } = useThree();
  useEffect(() => {
    const { camera } = get();
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = getBoardZoom(size.width, size.height, radius);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [get, size.width, size.height, radius]);
  return null;
}

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
      <BoardCamera radius={game.boardRadius} />
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[-4, 9, 5]}
        intensity={2.8}
        color="#fff2d0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-normalBias={0.04}
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
      {game.pawns.filter((pawn) => pawn.playerId === game.activePlayerId).map((pawn) => {
        const { x, z } = hexToWorld(pawn.hex.q, pawn.hex.r);
        return (
          <mesh key={pawn.playerId} position={[x, 0.155, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[HEX_TILE_RADIUS * 0.78, HEX_TILE_RADIUS * 0.91, 6]} />
            <meshBasicMaterial color="#ffe391" transparent opacity={0.85} depthWrite={false} />
          </mesh>
        );
      })}
      <Suspense fallback={null}>
        <GameCharacters
          game={game}
          room={room}
          surfaceY={HEX_TILE_HEIGHT / 2 + HEX_TILE_SURFACE_OFFSET}
        />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableRotate={false}
        minZoom={8}
        maxZoom={100}
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
  return (
    <div className="board-canvas" aria-label="Papan permainan heksagonal 3D">
      <Canvas
        shadows
        orthographic
        dpr={[1, 1.6]}
        camera={{ position: [10, 14.14, 10], zoom: 25, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <DeskScene game={game} room={room} />
      </Canvas>
    </div>
  );
}
