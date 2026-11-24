import { PoseTracker } from "./poseTracker";

const video = document.getElementById("webcam") as HTMLVideoElement;
const canvasElement = document.getElementById("output_canvas") as HTMLCanvasElement;
const webcamButton = document.getElementById("webcamButton") as HTMLButtonElement;

const poseTracker = new PoseTracker();

// ループ管理用の変数を削除し、現在の状態（未起動 / プレビュー中 / 撮影済み）を管理
type AppState = "IDLE" | "PREVIEW" | "CAPTURED";
let currentState: AppState = "IDLE";

// MediaPipeの初期化
async function setup() {
  try {
    await poseTracker.init();
    webcamButton.removeAttribute("disabled");
    webcamButton.innerText = "カメラを起動する";
    console.log("PoseTrackerの初期化が完了しました");
  } catch (error) {
    console.error("初期化エラー:", error);
    webcamButton.innerText = "初期化に失敗しました";
  }
}

// カメラの起動（プレビュー開始）
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });

  currentState = "PREVIEW";
  webcamButton.innerText = "撮影して評価する";
}

// プレビュー再開（撮影済みの状態からカメラ映像を再び動かす）
function resumePreview() {
  const ctx = canvasElement.getContext("2d");
  ctx?.clearRect(0, 0, canvasElement.width, canvasElement.height);

  video.play();
  currentState = "PREVIEW";
  webcamButton.innerText = "撮影して評価する";
}

// ループを廃止し、ボタンを押した瞬間の静止画を1回だけ推論・ログ出力する
function captureAndEvaluate() {
  // 映像を一時停止して「写真」の状態にする
  video.pause();

  const landmarks = poseTracker.detectAndDraw(video, canvasElement);

  if (landmarks) {
    const summary = poseTracker.extractKeyJoints(landmarks);
    console.log("撮影した写真の主要関節の数値:", summary);
  } else {
    console.log("人物が検出されませんでした");
  }

  currentState = "CAPTURED";
  webcamButton.innerText = "もう一度撮影する";
}

// ボタンイベント（状態に応じて動作を切り替え）
webcamButton.addEventListener("click", async () => {
  try {
    webcamButton.disabled = true;

    if (currentState === "IDLE") {
      await startCamera();
    } else if (currentState === "PREVIEW") {
      captureAndEvaluate();
    } else if (currentState === "CAPTURED") {
      resumePreview();
    }
  } catch (error) {
    console.error("カメラ操作エラー:", error);
    currentState = "IDLE";
    webcamButton.innerText = "カメラを起動する";
  } finally {
    webcamButton.disabled = false;
  }
});

setup()