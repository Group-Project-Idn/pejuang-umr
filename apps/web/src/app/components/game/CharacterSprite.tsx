"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { HEX_TILE_RADIUS } from "@/data/game";

type WorldPosition = readonly [x: number, y: number, z: number];

type CharacterSpriteProps = {
  name: string;
  sprite: string;
  position: WorldPosition;
};

const CHARACTER_HEIGHT = HEX_TILE_RADIUS * 1.8;
const MOVEMENT_DAMPING = 8;
const MOVEMENT_EPSILON = 0.012;
const BOB_HEIGHT = 0.055;
const BOB_SPEED = 10;

export default function CharacterSprite({
  name,
  sprite,
  position,
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
  const bobTime = useRef(0);
  const [initialPosition] = useState<WorldPosition>(() => [...position]);
  const target = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position],
  );
  const image = texture.image as { width: number; height: number };
  const aspectRatio = image.width / image.height;
  const characterWidth = CHARACTER_HEIGHT * aspectRatio;

  useEffect(
    () => () => {
      characterTexture.dispose();
    },
    [characterTexture],
  );

  useFrame((_, delta) => {
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
  });

  return (
    <group ref={group} position={initialPosition}>
      <mesh
        ref={shadow}
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
      <sprite
        ref={spriteObject}
        center={[0.5, 0]}
        scale={[characterWidth, CHARACTER_HEIGHT, 1]}
        renderOrder={2}
      >
        <spriteMaterial
          map={characterTexture}
          transparent
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
        style={{ pointerEvents: "none" }}
      >
        <span className="player-name">{name}</span>
      </Html>
    </group>
  );
}