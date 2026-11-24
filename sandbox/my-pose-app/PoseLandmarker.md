# PoseLandmarkerのテストコード

写真を撮って画像から類推し、人の姿勢と鼻、左手首、右手首の値をそれぞれ出力させた。

srcの中にある、主に[main.ts](./src/main.ts)がwebの処理、[poseTracker.ts](./src/poseTracker.ts)でPoseLandmarkerのコードがある。

構造が全く違うから全て消してpushするのが怖かったから新しくsandboxを作った。