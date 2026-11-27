# 香江卡丁車大賽 (Hong Kong Kart Race)

香港特色 3D 單人卡丁車賽車遊戲 — 靈感來自 Mario Kart，全部角色、賽道、道具均為原創。

A Hong Kong-themed 3D single-player kart racing game inspired by Mario Kart, with all-original characters, track, scenery and items.

## 玩法

- 沿維港環迴賽道跑 3 圈，對 3 個 AI 對手
- Race 3 laps around the Victoria Harbour circuit against 3 AI opponents

## 角色

- 冰室阿叔陳記 — 菠蘿包色車，起步快（加速 1.10）
- Turkey姐 — 牛丸小販車，防守勁
- 豆花檔主阿海 — 木桶豆腐花車，轉彎穩
- 腦場機神黃老闆 — 金色左拼右砌電腦主機車，專剋道具

## 香港特色道具

雞蛋仔（加速）、魚蛋串（追蹤飛彈）、菠蘿包（護罩）、腸粉（打滑陷阱）、紅豆冰（範圍凍結）、絲襪奶茶（無敵衝刺）

## 操作

- 鍵盤：方向鍵移動 / 選擇，Enter / 空白鍵確認，Esc 返回；比賽中 ↑ 加速、↓ 煞車、←→ 轉向、Space 漂移
- 手機：觸控按鈕
- Keyboard: arrow keys to move / select, Enter / Space to confirm, Esc to go back; in-race: ↑ accelerate, ↓ brake, ←→ steer, Space to drift
- Touch controls on mobile

## 音樂

- 大廳：〈維港放克〉(D 小調迪斯科放克)
- 比賽：〈霓虹衝刺〉(E 小調競速搖滾)

## 檔案結構

```
index.html          入口：HTML 骨架，載入 css + js
css/style.css       全部樣式
js/three.min.js     Three.js（3D 引擎）
js/characters.js    4 位角色大頭像（data URI，見下註）
js/billboards.js    4 張賽道旁相片廣告板（data URI，見下註）
js/game.js          遊戲邏輯：選單、道具、BGM、輸入、平衡、計圈
js/scene.js         3D 場景：賽道、維港景物、隧道、車手模型、物理、廣告板
README.md           本文件
```

註：角色大頭像原本是 4 張 `.webp` 圖（`char-chen.webp`、`char-turkey.webp`、
`char-hai.webp`、`char-wong.webp`），為咗令 GitHub 推送可以用純 UTF-8 文字檔
處理，呢度以 `data:image/webp` 形式收喺 `js/characters.js` 嘅
`CHAR_PORTRAITS` 入面，`js/game.js` 嘅 `CHARS[].img` 會引用佢哋。
如要換相，換 `js/characters.js` 入面對應嘅 data URI 字串即可。

## 賽道旁相片廣告板

賽道旁有 4 塊用真實香港相片做嘅廣告板（雙面顯示，連標題牌）：

- 維港夜景（中環海濱直路，f:.09）— 用戶揀嘅 #2 相：原本 wallpapercave 連結被封，
  改用另一張高清維港夜景全景（IFC + 中銀大廈）
- 天星小輪（天星碼頭旁，f:.435）— 用戶揀嘅 #5 相：日落時分嘅天星小輪
- 叮叮電車（銅鑼灣電車段，f:.545）— 用戶揀嘅 #4 相：137 號同 148 號雙層電車
- 大排檔夜色（街市段，f:.64）— 用戶揀嘅 #6 相：大排檔夜市

註：相片原本是 4 張 `.jpg` 圖（`billboard-harbour-night.jpg`、
`billboard-ferry.jpg`、`billboard-trams.jpg`、`billboard-daipaidong.jpg`），
同角色大頭像一樣，為咗令 GitHub 推送可以用純 UTF-8 文字檔處理，呢度以
`data:image/jpeg` 形式收喺 `js/billboards.js` 嘅 `BILLBOARD_PHOTOS` 入面，
`js/scene.js` 嘅 `billboards[].img` 會引用佢哋。
如要換相，換 `js/billboards.js` 入面對應嘅 data URI 字串即可。

## 執行

用瀏覽器開啟 `index.html` 即可遊玩。因為遊戲用多個檔案，直接雙擊
`index.html` 以 `file://` 開啟亦可；如瀏覽器攔截本地檔案載入，
請用簡單 HTTP 伺服器，例如：

```bash
python3 -m http.server 8000
# 然後開 http://localhost:8000/
```

Open `index.html` in a browser to play. If your browser blocks local file
loading, serve it with e.g. `python3 -m http.server 8000` and open
http://localhost:8000/

### 天星小輪廣告板修正（2026-11-27）

天星小輪嗰塊板喺部分手機 GPU 會成塊黑晒，因為嗰張 JPEG 用咗 4:2:0
chroma subsampling、高度 961（奇數），部分硬件 YUV 路徑處理唔到。
修正：相片重新編碼做 1280×960、progressive、4:4:4；4 塊板嘅相片
而家先經 2D canvas 解碼做 RGBA 再上載做 texture（`js/scene.js` 嘅
`bbPhotoTexture`，失敗時退回 `THREE.TextureLoader`）。

### 叮叮電車碰撞同路軌（2026-11-27）

之前撞到叮叮電車有時會冇效果：碰撞檢測用咗以電車中心做圓心、半徑 3.4
嘅圓，但電車車身係 3 闊 × 7.6 長嘅長方形，車頭車尾撞到時離中心遠至約
5.3，喺圓圈出面所以穿過咗都冇反應。修正：改用 oriented bounding box
（OBB）檢測，將車手座標轉入電車本身嘅方向空間再測試成個長方形
（`js/scene.js` 嘅 tram hazard 段），車身任何位置撞到都會打轉。
另外電車下面加咗成段電車路軌：深色路基橫跨成條馬路、兩條鋼軌加枕木，
長 56 覆蓋電車成個來回範圍，電車下面亦加咗轉向架（bogies），等佢
坐喺路軌上面。
