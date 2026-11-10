# monomane-battle

ブラウザ上で動作する1対1のポーズ対戦ゲーム。

## 技術構成

- React + TypeScript + Vite
- Node.js + TypeScript + Socket.IO
- MediaPipe
- WebRTC

## 必要環境

- Node.js 26.13.0
- npm 11.20.0
- nvm

## 環境構築（macOS / zsh）

nvmを導入した後、リポジトリをクローンする。

1. git clone https://github.com/USERNAME/monomane-battle.git
2. cd monomane-battle
3. nvm install
4. nvm use
5. npm ci

※ USERNAMEはリポジトリ所有者に置き換える。

## 開発サーバー起動

バックエンド：

    npm run dev:server

フロントエンド（別ターミナル）：

    npm run dev:client

ブラウザで http://localhost:5173 を開く。

## ビルド

    npm run build
