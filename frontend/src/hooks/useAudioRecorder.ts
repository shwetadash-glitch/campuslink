"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type RecorderState =
  | "UNINITIALIZED"
  | "PERMISSION_REQUEST"
  | "PERMISSION_DENIED"
  | "STANDBY_READY"
  | "RECORDING"
  | "PAUSED"
  | "REVIEWING"
  | "TRANSCRIBING_EVALUATING";

export interface AudioTelemetryData {
  duration_seconds: number;
  silence_duration_seconds: number;
  silence_ratio: number;
}

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    channelCount: 1,
    sampleRate: 48000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
};

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>("UNINITIALIZED");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [telemetry, setTelemetry] = useState<AudioTelemetryData>({
    duration_seconds: 0,
    silence_duration_seconds: 0,
    silence_ratio: 0,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Silence detection tracking
  const silenceSamplesRef = useRef<number>(0);
  const totalSamplesRef = useRef<number>(0);

  // Initialize or request microphone access
  const requestMicAccess = useCallback(async () => {
    setState("PERMISSION_REQUEST");
    setErrorMessage(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Your browser does not support audio recording. Please use Chrome, Edge, or Safari.");
      }

      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      mediaStreamRef.current = stream;

      // Initialize AudioContext & AnalyserNode for audio visualization
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      setState("STANDBY_READY");
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setState("PERMISSION_DENIED");
      setErrorMessage(
        err?.message || "Microphone access was denied. Please check your browser permissions to allow audio recording."
      );
    }
  }, []);

  // Setup Web Speech API fallback for real-time live transcript
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + " ";
          }
          setLiveTranscript(currentTranscript.trim());
        };

        recognition.onerror = (err: any) => {
          // Non-blocking fallback error
          console.warn("SpeechRecognition notice:", err?.error);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.warn("Web Speech API initialization warning:", e);
      }
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!mediaStreamRef.current) {
      await requestMicAccess();
    }

    if (!mediaStreamRef.current) return;

    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    audioChunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setLiveTranscript("");
    setDuration(0);
    silenceSamplesRef.current = 0;
    totalSamplesRef.current = 0;

    let mimeType = "audio/webm;codecs=opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else {
        mimeType = "";
      }
    }

    const recorder = mimeType
      ? new MediaRecorder(mediaStreamRef.current, { mimeType })
      : new MediaRecorder(mediaStreamRef.current);

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const finalBlob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      setAudioBlob(finalBlob);
      const url = URL.createObjectURL(finalBlob);
      setAudioUrl(url);
      setState("REVIEWING");
    };

    mediaRecorderRef.current = recorder;
    recorder.start(250); // collect chunks every 250ms

    // Start live captions via Web Speech API
    initSpeechRecognition();

    setState("RECORDING");

    // Track timer
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setDuration((prev) => {
        const next = prev + 1;

        // Sample silence using analyser
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          totalSamplesRef.current += 1;
          if (avg < 8) {
            // Volume threshold below 8 is considered silent
            silenceSamplesRef.current += 1;
          }
        }

        return next;
      });
    }, 1000);
  }, [initSpeechRecognition, requestMicAccess]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "RECORDING") {
      mediaRecorderRef.current.pause();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
      }
      setState("PAUSED");
    }
  }, [state]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "PAUSED") {
      mediaRecorderRef.current.resume();
      initSpeechRecognition();
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      setState("RECORDING");
    }
  }, [initSpeechRecognition, state]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
    }

    if (mediaRecorderRef.current && (state === "RECORDING" || state === "PAUSED")) {
      mediaRecorderRef.current.stop();

      // Calculate telemetry
      const totalTime = Math.max(1, duration);
      const silenceRatio = totalSamplesRef.current > 0
        ? silenceSamplesRef.current / totalSamplesRef.current
        : 0;
      const silenceSeconds = Math.round(totalTime * silenceRatio * 10) / 10;

      setTelemetry({
        duration_seconds: totalTime,
        silence_duration_seconds: silenceSeconds,
        silence_ratio: Math.round(silenceRatio * 100) / 100,
      });
    }
  }, [duration, state]);

  // Reset / Discard recording
  const resetRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    audioChunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setLiveTranscript("");
    setState(mediaStreamRef.current ? "STANDBY_READY" : "UNINITIALIZED");
  }, [audioUrl]);

  // Set evaluating state
  const setEvaluating = useCallback(() => {
    setState("TRANSCRIBING_EVALUATING");
  }, []);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    state,
    duration,
    errorMessage,
    audioBlob,
    audioUrl,
    liveTranscript,
    telemetry,
    analyserNode: analyserRef.current,
    requestMicAccess,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    setEvaluating,
    setLiveTranscript,
  };
}
