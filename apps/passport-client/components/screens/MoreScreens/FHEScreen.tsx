/* eslint-disable @typescript-eslint/no-explicit-any */
import { Spacer } from "@pcd/passport-ui";
import { MeshTransmissionMaterial, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { createGlobalStyle } from "styled-components";
import { Euler } from "three";
import { NewButton } from "../../NewButton";
import { H1, Placeholder } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

const OverrideStyles = createGlobalStyle`
  html {
    background-image: url("https://techcrunch.com/wp-content/uploads/2014/12/matrix.jpg?w=1000") !important;
    background-size: cover !important;
  }
`;

interface MatrixRainProps {
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  fallSpeed?: number;
  density?: number;
  characters?: string;
  glowColor?: string;
  glowIntensity?: number;
}

const MatrixRain: React.FC<MatrixRainProps> = ({
  fontSize = 14,
  textColor = "#0F0",
  backgroundColor = "rgba(0, 0, 0, 0.05)",
  fallSpeed = 1,
  density = 0.98,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?",
  glowColor = "#0F0",
  glowIntensity = 0.8
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener("resize", updateDimensions);
    updateDimensions();

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const columns = Math.floor(dimensions.width / fontSize);
    const drops: number[] = new Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px monospace`;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glowIntensity * 10;

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > density) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33 / fallSpeed);

    return () => clearInterval(interval);
  }, [
    dimensions,
    fontSize,
    textColor,
    backgroundColor,
    fallSpeed,
    density,
    characters,
    glowColor,
    glowIntensity
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1
      }}
    />
  );
};

export function FHEScreen(): ReactNode {
  return (
    <>
      <OverrideStyles />
      <MatrixRain />
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3 w-full bg-black rounded p-6 border-4 border-white">
          <H1 className="">FHEPASS</H1>
        </div>
        <Spacer h={24} />
        <Placeholder minH={540}>
          <div className="flex flex-col gap-2">
            <NewButton
              onClick={() => {
                window.location.href = "#/more";
              }}
            >
              Back
            </NewButton>

            <div className="p-4 border-4 border-white rounded-lg bg-black">
              <p>0xPARC</p>
              <p>is putting</p>
              <p>FHE</p>
              <p>IN A BOX!!!!</p>
            </div>

            <div className="w-full h-[400px] bg-black border-white border-4 rounded-lg ">
              <Canvas className="w-full h-full">
                <FHEAnimation />
              </Canvas>
            </div>
          </div>
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}

const FHEAnimation: React.FC = (): ReactNode => {
  const [rotation, setRotation] = useState([0, 0, 0]);

  const speed = 0.05;

  useFrame(() => {
    setRotation([
      rotation[0] + speed,
      rotation[1] + speed,
      rotation[2] + speed
    ]);
  });

  return (
    <>
      <ambientLight intensity={5} />
      <pointLight position={[10, 10, 10]} intensity={10000} />
      <pointLight position={[-10, -10, -10]} intensity={5} />
      <mesh rotation={new Euler(...rotation)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="green" roughness={0.5} metalness={0.5} />
      </mesh>
      <Ring
        text={"FHEFHEFHEFHEFHEFHEFHEFHEFHEFHEFHEFHE"}
        radius={2}
        height={100}
        segments={50}
      />
    </>
  );
};

interface Props {
  text: string;
  radius: number;
  height: number;
  segments: number;
}

export function Ring({ text, radius, height, segments }: Props): ReactNode {
  const ref = useRef<any>();

  // Rotate the text
  useFrame(() => {
    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.01;
    ref.current.rotation.z += 0.01;
  });

  // Calculate positions for text
  const textPositions: { x: number; z: number }[] = [];
  const angleStep = (2 * Math.PI) / text.length;
  for (let i = 0; i < text.length; i++) {
    const angle = i * angleStep;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    textPositions.push({ x, z });
  }

  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[radius, radius, height, segments]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={5}
          thickness={2}
        />
      </mesh>
      {text.split("").map((char: string, index: number) => (
        <Text
          key={index}
          position={[textPositions[index].x, 0, textPositions[index].z]}
          rotation={[0, -angleStep * index + Math.PI / 2, 0]}
          fontSize={0.3}
          lineHeight={1}
          letterSpacing={0.02}
          color="white"
          textAlign="center"
        >
          {char}
        </Text>
      ))}
    </group>
  );
}