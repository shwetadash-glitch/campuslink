"use client";

import React, { useRef, useEffect } from "react";

interface AudioWaveformVisualizerProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  height?: number;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  analyserNode,
  isRecording,
  height = 80,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      const width = rect.width;
      ctx.clearRect(0, 0, width, height);

      if (isRecording && analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);

        // Draw styled audio visualizer bars
        const barCount = 36;
        const barWidth = 4;
        const totalBarSpace = width / barCount;
        const gap = totalBarSpace - barWidth;

        for (let i = 0; i < barCount; i++) {
          const sampleIndex = Math.floor((i / barCount) * (bufferLength / 2));
          const value = dataArray[sampleIndex] || 0;
          const percent = value / 255;
          const barHeight = Math.max(4, percent * (height - 12));

          const x = i * totalBarSpace + gap / 2;
          const y = (height - barHeight) / 2;

          // Gradient color: Cyan/Indigo to Campus Blue
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, "#3b82f6"); // Blue
          gradient.addColorStop(0.5, "#6366f1"); // Indigo
          gradient.addColorStop(1, "#0ea5e9"); // Sky Blue

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        // Subtle idle pulse
        const time = Date.now() / 400;
        const barCount = 36;
        const barWidth = 3;
        const totalBarSpace = width / barCount;
        const gap = totalBarSpace - barWidth;

        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(time + i * 0.25) * 4 + 6;
          const x = i * totalBarSpace + gap / 2;
          const y = (height - wave) / 2;

          ctx.fillStyle = "#cbd5e1"; // Slate-300
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, wave, 1.5);
          ctx.fill();
        }
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isRecording, height]);

  return (
    <div className="w-full bg-slate-900/90 rounded-xl p-3 border border-slate-800 shadow-inner overflow-hidden">
      <div className="flex items-center justify-between text-2xs text-slate-400 mb-1.5 px-1 font-mono">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isRecording ? "bg-rose-500 animate-pulse" : "bg-emerald-400"
            }`}
          />
          {isRecording ? "LIVE AUDIO INPUT STREAM" : "STANDBY AUDIO VISUALIZER"}
        </span>
        <span>48kHz MONO • 16-BIT</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="block"
      />
    </div>
  );
};
