import {
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils,
    type NormalizedLandmark
} from "@mediapipe/tasks-vision"

// 出力するデータの定義
export interface KeyJointSummary {
    nose?: { x: number; y: number; z: number; visibility: number };
    leftWrist?: { x: number; y: number; z: number; visibility: number };
    rightWrist?: { x: number; y: number; z: number; visibility: number };
}

export class PoseTracker {
    private poseLandmarker: PoseLandmarker | undefined;
    private drawingUtils: DrawingUtils | undefined;
    
    // MediaPipeのモデルとWASMを読み込んで初期化する
    async init(): Promise<void> {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
                delegate: "GPU"
            },
            runningMode: "IMAGE",
            numPoses: 1
        });
    }

    // 静止画（または一時停止したvideo要素）1枚分の推論を行い、Canvasに描画してランドマークを返す
    detectAndDraw(
        imageSource: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
        canvas: HTMLCanvasElement
    ): NormalizedLandmark[] | undefined {
        if(!this.poseLandmarker) return undefined;

        // ソースの幅と高さを取得
        const width = 
            imageSource instanceof HTMLVideoElement
                ? imageSource.videoWidth
                : imageSource.width;
        const height =
            imageSource instanceof HTMLVideoElement
                ? imageSource.videoHeight
                : imageSource.height     
                
        if (width === 0 || height === 0) {
            return undefined;
        }

        // 描画の用意
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return undefined;

        if (!this.drawingUtils) {
            this.drawingUtils = new DrawingUtils(ctx);
        }

        // 推論結果
        const result = this.poseLandmarker.detect(imageSource)
        const firstPersonLandmarks = result.landmarks?.[0];

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 描画
        if (firstPersonLandmarks) {
            // 骨格の線を描画
            this.drawingUtils.drawConnectors(
                firstPersonLandmarks,
                PoseLandmarker.POSE_CONNECTIONS,
                {
                    color: "#00FF00",
                    lineWidth: 3
                }
            );

            // 間接の点を描画
            this.drawingUtils.drawLandmarks(firstPersonLandmarks, {
                color: "#FF0000",
                lineWidth: 1,
                radius: 3
            });
        }

        ctx.restore();
        return firstPersonLandmarks;
    }

    // 33個のランドマークから、確認しやすい主要関節だけを抜粋・整形する
    extractKeyJoints(landmarks: NormalizedLandmark[]): KeyJointSummary {
        const formatJoint = (index: number) => {
            const lm = landmarks[index];
            if (!lm) return undefined;
            return {
                x: Number(lm.x.toFixed(2)),
                y: Number(lm.y.toFixed(2)),
                z: Number(lm.z.toFixed(2)),
                visibility: Number((lm.visibility ?? 0).toFixed(2))
            };
        };

        // MediaPipe Poseのインデックス: 0 = 鼻, 15 = 左手首, 16 = 右手首
        return {
            nose: formatJoint(0),
            leftWrist: formatJoint(15),
            rightWrist: formatJoint(16)
        };
    }
}