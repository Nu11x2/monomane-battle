import { useRef, useState, useEffect } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { io } from "socket.io-client";

import "./App.css";

function App() {
  // Socket.ioの接続状態管理
  const [socketStatus, setSocketStatus] = useState("サーバーに接続中...");
  const [isConnected, setIsConnected] = useState(false);

  // HTML要素への参照
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // MediaPipeのインスタンスを保持
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);

  // カメラのストリームを保持
  const streamRef = useRef<MediaStream | null>(null);

  // タイマーを保持
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // アプリの画面状態
  const [status, setStatus] = useState("サーバーからの応答を待っています...");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasCaptured, setHasCaptured] = useState(false);

  // Socket.ioの初期化と後処理
  useEffect(() => {
    const socket = io();

    socket.on("connect", () => {
      setSocketStatus("サーバーと接続しました");
    });

    // バックエンドからのhelloメッセージを受け取ってはじめて操作可能にする
    socket.on("server:hello", (message: string) => {
      setSocketStatus(message);
      setIsConnected(true);
      setStatus("カメラを起動してください");
    });

    socket.on("connect_error", (error) => {
      setSocketStatus(`接続エラー: ${error.message}`);
      setIsConnected(false);
      setStatus("サーバーに接続できません");
    });

    socket.on("disconnect", () => {
      setSocketStatus("サーバーから切断されました");
      setIsConnected(false);
      setStatus("サーバーから切断されました");
      stopCamera(); // 切断されたらカメラも強制停止
    });

    return () => {
      socket.disconnect();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      poseLandmarkerRef.current?.close();
    };
  }, []);

  // MediaPipeの初期化
  const initializePoseLandmarker = async () => {
    if (poseLandmarkerRef.current) {
      return;
    }

    setStatus("MediaPipeを初期化しています...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const poseLandmarker = await PoseLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
      }
    );

    poseLandmarkerRef.current = poseLandmarker;

    setStatus("MediaPipeの準備が完了しました");
  };

  // カメラの起動
  const startCamera = async () => {
    if (!isConnected) return;

    try {
      setIsLoading(true);
      setStatus("カメラを起動しています...");

      await initializePoseLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video要素が見つかりません");
      }

      video.srcObject = stream;
      await video.play();

      setIsCameraOn(true);
      setStatus("撮影準備完了");

    } catch (error) {
      console.error(error);
      setStatus("カメラまたはMediaPipeの起動に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 撮影と姿勢推定
  const captureAndEstimate = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !poseLandmarker) {
      setStatus("撮影に必要な準備ができていません");
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setStatus("カメラ映像を取得できません");
      return;
    }

    try {
      setStatus("撮影・姿勢推定中...");

      const width = video.videoWidth;
      const height = video.videoHeight;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("CanvasのContextを取得できません");
      }

      ctx.drawImage(video, 0, 0, width, height);

      const result = poseLandmarker.detect(canvas);
      const drawingUtils = new DrawingUtils(ctx);

      if (result.landmarks.length > 0) {
        for (const landmarks of result.landmarks) {
          drawingUtils.drawConnectors(
            landmarks,
            PoseLandmarker.POSE_CONNECTIONS,
            { color: "#00FF00", lineWidth: 3 }
          );

          drawingUtils.drawLandmarks(
            landmarks,
            { color: "#FF0000", lineWidth: 2, radius: 4 }
          );
        }

        setStatus(
          `姿勢推定完了：${result.landmarks[0].length}個のランドマークを検出`
        );
      } else {
        setStatus("人物を検出できませんでした");
      }

      setValueAndCaptured: setHasCaptured(true);
      setHasCaptured(true);

    } catch (error) {
      console.error(error);
      setStatus("撮影または姿勢推定に失敗しました");
    }
  };

  // 3秒のカウントダウン
  const startCountdown = () => {
    if (!isCameraOn || countdown !== null) {
      return;
    }

    setHasCaptured(false);

    let remaining = 3;
    setCountdown(remaining);
    setStatus("撮影までカウントダウン中...");

    const count = () => {
      if (remaining === 1) {
        setCountdown(null);
        captureAndEstimate();
        return;
      }

      remaining -= 1;
      setCountdown(remaining);

      timerRef.current = setTimeout(count, 1000);
    };

    timerRef.current = setTimeout(count, 1000);
  };

  // カメラ停止
  const stopCamera = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
    setCountdown(null);
    setHasCaptured(false);
    if (isConnected) {
      setStatus("カメラを停止しました");
    }
  };

  // 再撮影
  const resetCapture = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    setHasCaptured(false);
    setStatus("撮影準備完了");
  };

  return (
    <main className="app">
      <h1>Monomane Battle</h1>
      <h2>Pose Landmarker</h2>

      {/* サーバーとの接続ステータスを表示 */}
      <div className="socket-status" style={{ marginBottom: "10px", fontSize: "0.9rem", color: isConnected ? "green" : "orange" }}>
        <b>サーバー状態:</b> {socketStatus}
      </div>

      <p className="status">{status}</p>

      <div className="view-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            display: isCameraOn && !hasCaptured ? "block" : "none",
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            display: hasCaptured ? "block" : "none",
          }}
        />

        {countdown !== null && (
          <div className="countdown">
            {countdown}
          </div>
        )}

        {!isCameraOn && (
          <div className="camera-message">
            {!isConnected ? "サーバー接続待ち..." : "カメラは停止中です"}
          </div>
        )}
      </div>

      <div className="controls">
        {!isCameraOn ? (
          <button
            onClick={startCamera}
            disabled={isLoading || !isConnected} // サーバーに接続されるまでボタンを無効化
          >
            {isLoading ? "起動中..." : "カメラ起動"}
          </button>
        ) : (
          <>
            <button
              onClick={startCountdown}
              disabled={countdown !== null}
            >
              撮影する
            </button>

            {hasCaptured && (
              <button onClick={resetCapture}>
                再撮影
              </button>
            )}

            <button
              onClick={stopCamera}
              disabled={countdown !== null}
            >
              カメラ停止
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default App;