"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { HEX_TILE_RADIUS } from "@/data/game";
import { restoreInviteCursor, showInviteCursor } from "./invite-cursor";

type WorldPosition = readonly [x: number, y: number, z: number];

type CharacterSpriteProps = {
  name: string;
  sprite: string;
  position: WorldPosition;
  /** Pion bisa diketuk (pilih target Ajakan); tanpa ini pion tidak interaktif. */
  onSelect?: () => void;
  dimmed?: boolean;
};

// Pion tidak boleh menelan klik heksa kecuali saat mode pilih target Ajakan.
const noRaycast = () => null;
const CHARACTER_HEIGHT = HEX_TILE_RADIUS * 1.8;
const MOVEMENT_DAMPING = 8;
const MOVEMENT_EPSILON = 0.012;
const BOB_HEIGHT = 0.055;
const BOB_SPEED = 10;

export default function CharacterSprite({
  name,
  sprite,
  position,
  onSelect,
  dimmed = false,
}: CharacterSpriteProps) {
  const texture = useTexture(sprite);
  const characterTexture = useMemo(() => {
    const configuredTexture = texture.clone();
    configuredTexture.colorSpace = THREE.SRGBColorSpace;
    configuredTexture.minFilter = THREE.LinearFilter;
    configuredTexture.magFilter = THREE.LinearFilter;
    configuredTexture.generateMipmaps = false;
    configuredTexture.needsUpdate = true;
    return configuredTexture;
  }, [texture]);
  const group = useRef<THREE.Group>(null);
  const spriteObject = useRef<THREE.Sprite>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const selectionRing = useRef<THREE.Mesh>(null);
  const hoveredCanvas = useRef<HTMLCanvasElement | null>(null);
  const cursorOwner = useRef({});
  const [reducedMotion, setReducedMotion] = useState(false);
  const bobTime = useRef(0);
  const [initialPosition] = useState<WorldPosition>(() => [...position]);
  const target = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position],
  );
  const image = texture.image as { width: number; height: number };
  const aspectRatio = image.width / image.height;
  const characterWidth = CHARACTER_HEIGHT * aspectRatio;
  const selectable = Boolean(onSelect);

  useEffect(() => () => {
    if (hoveredCanvas.current) {
      restoreInviteCursor(hoveredCanvas.current, cursorOwner.current);
      hoveredCanvas.current = null;
    }
  }, [selectable]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(
    () => () => {
      characterTexture.dispose();
    },
    [characterTexture],
  );

  useFrame(({ clock }, delta) => {
    const character = group.current;
    const characterImage = spriteObject.current;
    const characterShadow = shadow.current;
    if (!character || !characterImage || !characterShadow) return;

    const distance = character.position.distanceTo(target);
    const isMoving = distance > MOVEMENT_EPSILON;
    if (isMoving) {
      character.position.x = THREE.MathUtils.damp(
        character.position.x,
        target.x,
        MOVEMENT_DAMPING,
        delta,
      );
      character.position.y = THREE.MathUtils.damp(
        character.position.y,
        target.y,
        MOVEMENT_DAMPING,
        delta,
      );
      character.position.z = THREE.MathUtils.damp(
        character.position.z,
        target.z,
        MOVEMENT_DAMPING,
        delta,
      );
      bobTime.current += delta * BOB_SPEED;
    } else {
      character.position.copy(target);
      bobTime.current = 0;
    }

    const bob = isMoving
      ? Math.abs(Math.sin(bobTime.current)) * BOB_HEIGHT
      : 0;
    characterImage.position.y = THREE.MathUtils.damp(
      characterImage.position.y,
      bob,
      14,
      delta,
    );
    const shadowScale = isMoving ? 0.82 : 1;
    characterShadow.scale.x = THREE.MathUtils.damp(
      characterShadow.scale.x,
      shadowScale,
      12,
      delta,
    );
    characterShadow.scale.y = THREE.MathUtils.damp(
      characterShadow.scale.y,
      shadowScale,
      12,
      delta,
    );
    const ring = selectionRing.current;
    if (ring) {
      const pulse = !reducedMotion ? 1 + 0.07 * Math.sin(clock.elapsedTime * 2.5) : 1;
      ring.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group
      ref={group}
      position={initialPosition}
      onClick={onSelect ? (event) => {
        event.stopPropagation();
        onSelect();
      } : undefined}
      onPointerOver={onSelect ? (event) => {
        event.stopPropagation();
        const canvas = event.nativeEvent.target as HTMLCanvasElement;
        hoveredCanvas.current = canvas;
        showInviteCursor(canvas, cursorOwner.current);
      } : undefined}
      onPointerOut={onSelect ? () => {
        if (hoveredCanvas.current) {
          restoreInviteCursor(hoveredCanvas.current, cursorOwner.current);
          hoveredCanvas.current = null;
        }
      } : undefined}
    >
      <mesh
        ref={shadow}
        raycast={noRaycast}
        position={[0, 0.008, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <circleGeometry args={[HEX_TILE_RADIUS * 0.38, 32]} />
        <meshBasicMaterial
          color="#111318"
          transparent
          opacity={0.24}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      {onSelect ? <>
        <mesh ref={selectionRing} raycast={noRaycast} position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[HEX_TILE_RADIUS * 0.54, HEX_TILE_RADIUS * 0.66, 40]} />
          <meshBasicMaterial color="#ffe067" side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, CHARACTER_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[HEX_TILE_RADIUS * 0.9, HEX_TILE_RADIUS * 0.9, CHARACTER_HEIGHT, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </> : null}
      <sprite
        ref={spriteObject}
        raycast={onSelect ? undefined : noRaycast}
        center={[0.5, 0]}
        scale={[characterWidth, CHARACTER_HEIGHT, 1]}
        renderOrder={2}
      >
        <spriteMaterial
          map={characterTexture}
          transparent
          opacity={dimmed ? 0.35 : 1}
          alphaTest={0.03}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <Html
        position={[0, 0.02, HEX_TILE_RADIUS * 0.52]}
        center
        transform
        distanceFactor={9}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: "none" }}
      >
        <span className="player-name">{name}</span>
      </Html>
    </group>
  );
}