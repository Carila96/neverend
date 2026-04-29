# neverEND 開発引き継ぎ書 v1.0
**作成日：2026-04-25**
**対象：このプロジェクトを初めて引き継ぐ開発者・AI**
**重要：このドキュメントを読めばokakaのサポートをすぐに開始できる**

---

## ■1. このドキュメントの目的

neverENDは高橋一暉（okaka）が個人で開発しているWebサービスです。
コードはほぼ全てClaudeが生成し、okakaが動作確認・判断・方針決定を行っています。

このドキュメントは以下を可能にします：
- 開発の継続
- バグ修正
- システムの運用
- okakaの意図を正確に汲んだサポート

**okakaへの対応で最も重要なこと：**
- 行動前に必ず確認する
- 要約・省略しない
- ステージ修正前に必ずコードを読んで現在の値を確認する
- 推測で座標を指定しない
- 指摘内容は全文そのまま保存する（要約すると修正が外れる）

---

## ■2. プロジェクト現状

### 全体進捗
- テストプレイ公開まで：約70%
- 正式公開まで：約45%

### 完了済み
- ゲーム本体（Stage 1-50実装済み）
- 決済フロー（Stripe → Webhook → Supabase）
- テストモードURL（?mode=test）
- 名前入力・クレジット登録システム
- 称号システム（Tier 1-8、約40種類）
- MyPageトロフィー棚
- ログイン機能（Supabase Auth）※動作未確認
- 販売ページ新フロー（画像→ドット化→配置→購入）
- Hall of Legends
- SEOメタタグ・robots.txt・sitemap.xml
- 死亡演出改善（パーティクル・DAMN!ズームイン・エッジビネット）
- 共通バグ修正（ゴール到達後の入力引き継ぎ・振り子当たり判定・ゴール重複バリデーション）

### 部分実装・動作未確認
- 販売ページ新グリッド（128×72）・新価格体系 → デプロイ済み、動作未確認
- ログイン機能 → 実装済み、動作未確認
- ロゴのゲーム内表示 → 実装済み、動作未確認
- 販売ページ衝突ブロック削除フロー（isDeletedがスタブのまま）

### 未実装
- 価格自動値上げシステム（Supabaseの累計売上を見て自動値上げ）
- 1面独占B方式（既存購入者がいる面の独占購入）
- アニメーションGIF対応（1面独占購入者特典）
- BGM Stage 40以降
- Stage 51-100

### 現在のブロッカー
- Stage 5のバグが長期間未修正（後述）
- ジャンプ挙動の調整（初速・重力を上げるとカクつく問題）

---

## ■3. リポジトリ構成

```
C:\neverEND（ローカル）/ GitHub: Carila96/neverend（main）

├── index.html                    ← ゲーム本体（最重要・最も頻繁に変更）
├── vercel.json                   ← Vercelルーティング設定
├── package.json                  ← 依存関係
├── .env.local                    ← ローカル環境変数（GitHubにpushしない）
├── .gitignore
├── api/                          ← Vercel Serverless Functions（12個上限厳守）
│   ├── auth-sync.js              ← ログイン後のデータ同期
│   ├── cancel-reservation.js     ← 予約キャンセル
│   ├── create-checkout.js        ← Stripe Checkoutセッション作成
│   ├── death.js                  ← 世界累計死亡数の取得・更新
│   ├── grid.js                   ← グリッドのブロック状態取得
│   ├── register-tester.js        ← テストプレイヤー登録
│   ├── reserve.js                ← ブロック仮押さえ
│   ├── session-log.js            ← セッションログ記録
│   ├── stage-logo.js             ← ロゴ一時保存
│   ├── upload-logo.js            ← ロゴアップロード
│   ├── webhook.js                ← Stripe Webhook処理（最重要API）
│   └── world-stats.js            ← 世界統計取得
├── app/
│   ├── .env.example              ← 環境変数テンプレート（ダミー値のみ）
│   ├── data/
│   │   └── schema.sql            ← Supabaseスキーマ定義（参照用）
│   └── pages/
│       ├── mypage.html           ← マイページ（現在はゲーム内Canvasで実装）
│       ├── sales_page.html       ← 販売ページ（最重要ページ）
│       └── success.html          ← 決済完了後リダイレクト先
├── public/
│   ├── cancel.html               ← 決済キャンセル後リダイレクト先
│   ├── hall-of-legends.html      ← Hall of Legends
│   ├── og-image.html             ← OGイメージ用HTML
│   ├── robots.txt
│   ├── sitemap.xml
│   └── success.html              ← 決済完了（rootのsuccess.htmlと競合確認要）
└── docs/
    ├── CLOUDFLARE_SETUP.md       ← Cloudflare移行ガイド（将来用）
    ├── future/                   ← 将来機能の検討メモ
    ├── legal/                    ← 法的文書5点（変更する場合は慎重に）
    │   ├── content_policy.md
    │   ├── cookie_policy.md
    │   ├── ip_dmca_policy.md
    │   ├── privacy_policy.md
    │   └── terms_of_service.md
    └── specification/
        ├── map_design_rules.md   ← ステージ設計ルール（必読）
        ├── neverend_core_spec.md ← 旧仕様書
        ├── neverend_master_spec_v7.md ← 最新仕様書（必読）
        └── sales_page_spec.md    ← 販売ページ仕様
```

**source of truth：**
- ゲームロジック → index.html
- 価格・グリッド仕様 → 本ドキュメント + neverend_master_spec_v7.md
- 販売ページ → app/pages/sales_page.html

---

## ■4. 環境・デプロイ

### 本番環境
- URL：https://neverend.vercel.app
- ホスティング：Vercel（Hobbyプラン）
- DB：Supabase（cokcftutqkwhfbmdnhgl.supabase.co）
- 決済：Stripe（現在テストモード sk_test_）

### 環境変数（Vercelに設定済み）
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
STRIPE_SECRET_KEY（現在テストモード）
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_BASE_URL=https://neverend.vercel.app
```

**⚠️ .env.localにAPIキーは存在しない。全てVercel環境変数で管理。**

### デプロイ手順
```
cd C:\neverEND
git add .
git commit -m "説明"
git push origin main
npx vercel --prod
```

### デプロイが反映されない場合
Vercelダッシュボード → Deployments → 最新の「...」→「Promote to Production」

### 設定ファイル（確定）

**vercel.json:**
```json
{
  "outputDirectory": ".",
  "rewrites": [{ "source": "/api/:path*", "destination": "/api/:path*" }]
}
```

**package.json:** `"type": "module"` が必須（api/*.jsのESM importのため）

### 構文チェック
```
node --check index.html
```

### Vercel APIファイル上限
**12個厳守。追加する場合は既存ファイルを削除または統合すること。**

---

## ■5. ゲームコア構造（index.html）

### 基本情報
- 1ファイルですべてのゲームロジックを実装
- Canvas 2D APIを使用
- 1280×720px固定解像度

### ゲームの流れ
```
ページ読込
→ 名前入力画面（初回のみ、localStorage 'neverend_playername'）
→ タイトル画面
→ SPACEでゲーム開始
→ Stage 1からスタート
→ 死亡 → Stage 1に戻る（これがコアメカニクス）
→ ゴール到達 → 次のStageへ
→ 最終Stage到達 → エンドレス
```

### モード
| モード | 起動方法 | 内容 |
|---|---|---|
| 通常 | デフォルト | 30秒タイマー |
| Hard | タイトルでHHHHH | 25秒、全トラップ警告なし |
| Baby | タイトルでGIVEUP | 60秒、ステージセーブあり、煽り文句 |
| **Admin** | **↑↑↓↓←→←→BA1984** | N/Vでステージ移動、統計カウントなし、称号付与なし |
| Retro | タイトルでRRRRR | CRTオーバーレイ |

### 重要なゲームパラメータ
- ジャンプ速度：player.vy = -16（現在値、okakaは初速を上げたいが重力との兼ね合いで調整中）
- 重力：player.vy += 0.7（毎フレーム）
- 最大落下速度：player.vy = 20（上限）
- タイマー：timeLeft -= dt（毎フレーム、adminModeでも減る）
- 移動速度：要コード確認

### fallingSpikes（落下スパイク）のトリガー条件
```javascript
if(!f.triggered && player.x > f.triggerX)
```
**⚠️ 重要：この条件は「プレイヤーのxがtriggerXより大きい時」に発動する。**
- 左→右移動ステージ：triggerXをスパイクのxより小さい値に設定
- 右→左移動ステージ（Stage 5等）：triggerXをスパイクのxより大きい値に設定（プレイヤーが通過後に発動するため）

### localStorageキー
- neverend_playername：プレイヤー名
- neverend_totalDeaths：累計死亡数
- neverend_bestStage：最高到達ステージ
- neverend_totalPlayTime：累計プレイ時間（秒）
- neverend_contract_id：購入済み契約ID
- neverend_monopoly_owner：1面独占購入フラグ
- neverend_testmode：テストモードフラグ（sessionStorage）

### テストモード
- URL：https://neverend.vercel.app?mode=test
- 販売ページリンク非表示
- Stage 20以降プレイ不可
- TEST MODEバッジ表示
- sessionStorageで他ページ遷移後も維持

---

## ■6. ステージ設計ルール（必読）

### 絶対に守るルール
- 全座標は16pxの倍数
- スパイクはプラットフォーム上面のみ
- スポーン位置にスパイク禁止
- ゴールの座標範囲内にスパイクを配置しない
- 動く足場速度4.0以上
- vx>0の足場はsx=x（プレイヤー側から開始）
- 落下スパイクは天井から開始（startY:0付近）

### ステージデータ構造
```javascript
{
  name: 'STAGE N',
  sub: 'サブタイトル',
  plats: [{x, y, w, h}],           // 足場
  spikes: [{x, y, w, h}],          // 静的スパイク
  traps: [{x, y, w, h, tx, warn}], // トラップ（warn:falseで非表示）
  fallingSpikes: [{x, y, w, h, triggerX, speed, triggered, startY, currentY}],
  move: [{x, y, w, h, vx, vy, rx, ry, sx, sy}], // 動く足場
  chasers: [{x, y, w, h, speed, triggerX, active}],
  lava: [{x, y, w, h, rise}],
  pendulums: [{pivotX, pivotY, length, angle, speed}],
  mimics: [{x, y, w, h}],
  hg: [{x, y, w, h}],              // 砂時計（+5秒）
  focusZones: [],
  darkness: {enabled: false},
  goal: {x, y, w, h},
  spawn: {x, y}
}
```

### ステージ修正の絶対ルール
1. **修正前に必ずそのステージの現在のコードをClaude Codeに表示させる**
2. **推測で座標を入力しない**
3. **plats・spikes・fallingSpikes等のブロックを丸ごと置き換える形で指示する**
4. **修正後に表示して確認してから次に進む**

---

## ■7. ステージバグリスト（2026-04-25時点）

### 修正済み（okakaが手動確認）
- ジャンプ挙動：修正済み（初速・重力の調整は継続検討中）
- 共通：ゴール到達後の入力引き継ぎ → 修正済み
- 共通：振り子の当たり判定 → 修正済み
- 共通：ゴール範囲内のスパイク自動削除バリデーション → 修正済み
- 共通：スポーン近くのトラップ自動削除バリデーション → 修正済み

### 未修正（高優先度）

**Stage 5（長期未修正・最優先）**

現在のコード：
```javascript
{name:'STAGE 5',sub:'Run. The other way.',
 plats:[
   {x:0,y:656,w:1280,h:64},
   {x:0,y:160,w:1280,h:32},
   {x:640,y:160,w:32,h:192},
   {x:640,y:448,w:32,h:208},
   {x:0,y:160,w:32,h:496},
   {x:480,y:192,w:160,h:16},  ← 天井に埋まっている（y:192=天井下端）
   {x:672,y:192,w:160,h:16},  ← 同上
   {x:480,y:496,w:160,h:16},
   {x:672,y:496,w:160,h:16},
 ],
 fallingSpikes:[
   {x:352,y:160,w:32,h:48,triggerX:416,speed:480,...},
   {x:496,y:160,w:32,h:48,triggerX:560,speed:480,...},
 ],
 spawn:{x:1200,y:608}, goal:{x:48,y:528,w:64,h:128}}
```

okakaの要求（全文）：
- 足場は真ん中の壁を挟んで左右2個ずつ計4個（下段のみ、上段不要）
- 一番床に近い足場にだけスパイク（透明スパイクが望ましい）
- fallingSpikes：条件は`player.x > triggerX`、プレイヤーは右(x:1200)から左移動
- x:352スパイク → triggerX:416（プレイヤーがx:416通過時に発動）
- x:496スパイク → triggerX:560（プレイヤーがx:560通過時に発動）
- 修正前に必ずコードを読んで確認してから修正する

正しい修正内容（次回Claude Codeに渡すコード）：
```javascript
plats:[
  {x:0,y:656,w:1280,h:64},
  {x:0,y:160,w:1280,h:32},
  {x:640,y:160,w:32,h:192},
  {x:640,y:448,w:32,h:208},
  {x:0,y:160,w:32,h:496},
  {x:480,y:496,w:160,h:16},  // 下段左
  {x:672,y:496,w:160,h:16},  // 下段右
],
spikes:[
  {x:128,y:624,w:32,h:32},
  {x:800,y:624,w:32,h:32},
  {x:832,y:624,w:32,h:32},
  {x:864,y:624,w:32,h:32},
  {x:480,y:464,w:32,h:32},   // 下段左足場の上
  {x:512,y:464,w:32,h:32},
  {x:672,y:464,w:32,h:32},   // 下段右足場の上
  {x:704,y:464,w:32,h:32},
],
fallingSpikes:[
  {x:352,y:160,w:32,h:48,triggerX:416,speed:480,triggered:false,startY:160,currentY:160},
  {x:496,y:160,w:32,h:48,triggerX:560,speed:480,triggered:false,startY:160,currentY:160},
],
```

**Stage 4**
- 動く足場2個を逆方向に動かす
- 速度を統一してもう少し速く、切り返しも速く

**Stage 6**
- ゴールをゴール下の足場からジャンプしないと届かない高さに移動

**Stage 7**
- ゴール左側の床から生えている見えないトゲを3個（床から生える・浮かない）

### 未修正（中優先度）
```
Stage 11：スパイクが少ない
Stage 13：最終足場のスパイク位置調整
Stage 14：スパイクが機能していない・要大幅変更
Stage 15：ミミックの形が変、ミミックに届かない、マップ左半分しか使っていない
Stage 17：中央に足場必要、砂時計がゴールと重複
Stage 18：スパイクを床の上に置く、スパイク数を減らして復帰できるように
Stage 20：動く足場と静的足場が重なっている
Stage 22：開始位置のスパイクが床に正しく置かれていない
Stage 24：指示していない浮きスパイクを削除
Stage 27：落下スパイクのタイミング調整・天井を下げる・段差を作る
Stage 29：ほぼ同じマップが別にある・バリエーション追加
Stage 31：ゴールへの道となる足場がない
Stage 32：足場の配置が悪くジャンプで届かない
Stage 33：プレイヤーが境界ボックス内からスタート・調整必要
Stage 34：スタート位置にスパイクを置かない
Stage 35：ミミック踏んだ後の逃げ場がない
```

### 共通の既知問題
- 一本道・二択で簡単な方が常に有効なマップが多い → 複雑なルートを強制する設計に
- 見た目が簡単そうなルートに隠しトゲを置く

---

## ■8. グリッド・価格体系（最終確定 2026-04-28）

### グリッド仕様（確定）
| 項目 | 内容 |
|---|---|
| グリッド | 128×72 = 9,216マス（全ステージ統一） |
| クリエイターゾーン | 廃止（全ステージ同一グリッド） |
| ゲームエンジン | 変更なし（16×16pxのまま） |
| 広告グリッド表示 | 10×10px/マス |
| 1マス | 1色固定 |
| レトロモード | 視覚的に80×45に見えるだけ、グリッドデータは128×72のまま |

### 価格体系（確定 2026-04-28）

価格は全ステージ合計の累計claimed blocks数に基づいて決まる（新規購入のみカウント、更新はカウントしない）。

| 累計claimed blocks | 面月額 | 1マス単価 |
|---|---|---|
| 0 - 20,000 | $1,000/月 | $0.40/マス |
| 20,001 - 50,000 | $2,000/月 | $0.70/マス |
| 50,001 - 90,000 | $3,500/月 | $1.10/マス |
| 90,001 - 140,000 | $5,000/月 | $1.60/マス |
| 140,001 - 300,000 | $7,500/月 | $2.40/マス |
| 300,001 - 800,000 | $10,000/月 | $3.10/マス |
| 800,001+ | $12,500/月 | $4.00/マス |

**価格ロック：** 購入者はサブスクリプション継続中は購入時の価格を維持。解約すると価格ロック消滅。

**年払いプラン：** 10ヶ月分前払い（2ヶ月無料）。1面独占にも適用。

### 購入ルール
- 最低購入マス数：なし（1マスから）
- 最低決済金額：$1
- ボリュームディスカウント（マス単価購入のみ、1面独占には適用しない）：
  - 200-499マス：-10%
  - 500-999マス：-20%
  - 1,000+マス：-30%
- 全購入者が購入時の価格で永久固定（解約で消滅、譲渡不可）
- **最大所有マス数：18,432マス（2面分 = 2 × 9,216）**

### 1面独占ルール
- 現在の面月額で1面全体を購入
- ボリュームディスカウント適用なし
- 年払いディスカウントは適用
- 既存購入者がいる場合：独占購入者はすぐにその分を取得しない。既存購入者が解約した時点でブロックが独占購入者へ自動移転
- 面月額は既存購入者の保有マス数に関係なく変動しない

### 永続購入（Lifetime）
- 解除条件：面月額が$7,500に到達した時点でアンロック
- 価格：購入者の現在月額 × 24ヶ月
- 上限：$10,000/月以上は一律$240,000
- 対象：1面独占購入者のみ
- 一括払い・以降の月額請求なし
- 購入後のキャンセル・返金不可

### 価格上昇のUI表示方針
- 「グリッドが埋まっていく」として公開表示（収益ベースとしては説明しない）
- 進行バー：claimed blocks数 vs 次の段階のトリガー数
- 「早く買うほどお得」メッセージング
- 「Prices rise as the world fills」

### 購入フロー
```
1. 画像アップロード（スクロール・拡大縮小・トリミング）
2. サイズ選択・ドット化プレビュー（リアルタイム）
3. 色編集（色置き換え・透明化）
4. ステージ選択（ネオン中抜きアウトラインのマッププレビュー）
5. グリッド上に配置（空き・購入済み・仮押さえを色分け）
6. 確認 → Stripe決済
7. Webhook → logo_stagingからplacements自動作成
8. ゲーム内に即反映
```

---

## ■9. Supabaseテーブル構成

| テーブル | 用途 |
|---|---|
| subscription_contracts | 契約レコード（1購入=1レコード） |
| owned_blocks | ブロック所有（x<128, y<72） |
| placements | ロゴ配置情報（ロゴアップロード後に作成） |
| reservation_sessions | 30分仮押さえ |
| stripe_webhook_events | Webhook冪等性保証 |
| world_stats | 世界累計死亡数・累計売上 |
| session_logs | セッションログ |
| test_players | テストプレイヤー登録 |
| logo_staging | 購入前ロゴ一時保存 |
| player_profiles | ログインユーザーのプロフィール |

**⚠️ placementsはWebhookで作成しない。logo_stagingのデータをWebhookが読み取って作成する。**

### スキーマ更新履歴（2026-04-28 適用済み）

| テーブル | 変更内容 |
|---|---|
| reservation_sessions | anchor_x制約: 0〜79 → 0〜127 |
| reservation_sessions | anchor_y制約: 0〜44 → 0〜71 |
| reservation_sessions | カラム追加: price_per_block (numeric) |
| reservation_sessions | カラム追加: monthly_total (numeric) |
| subscription_contracts | カラム追加: price_per_block (numeric) |
| subscription_contracts | カラム追加: monthly_total (numeric) |
| owned_blocks | 制約: x < 128, y < 72 （旧: x < 80, y < 45）|

---

## ■10. API仕様

### POST /api/reserve
- 役割：グリッドブロックを30分仮押さえ
- 入力：{stage_id, anchor_x, anchor_y, width, height, zone_type, plan_type}
- 出力：{session_key, expires_at, block_count, price_per_block, monthly_total}
- DB：reservation_sessions（price_per_block・monthly_total保存）, owned_blocks(status:'reserved')
- 価格：購入前のclaimed blocks数でティアを決定（リアルタイム計算）

### POST /api/create-checkout
- 役割：Stripe Checkoutセッション作成
- 入力：{session_key, plan_type}
- 出力：{url}（StripeのCheckout URL）

### POST /api/webhook
- 役割：Stripe Webhook処理（最重要）
- イベント：checkout.session.completed
- 処理：subscription_contracts作成 → owned_blocks status:'claimed'に更新 → logo_stagingからplacements作成
- 冪等性：stripe_webhook_eventsで重複処理防止

### POST /api/cancel-reservation
- 役割：仮押さえ解除（戻るボタン押下時）
- 入力：{session_key}
- 処理：owned_blocks(reserved)削除 → reservation_sessions status:'expired'

### GET /api/grid
- 役割①：ステージのブロック状態取得（?stage_id=N）
  - 出力：{placements[], blocks[], claimed_count, reserved_count}
- 役割②：現在の価格ティア取得（?tier=1）
  - 出力例：
  ```json
  {
    "totalClaimedBlocks": 1028,
    "currentTier": { "monthlyFull": 1000, "pricePerBlock": 0.40, "minBlocks": 0, "maxBlocks": 20000 },
    "nextTier": { "monthlyFull": 2000, "pricePerBlock": 0.70, "triggerBlocks": 20001, "blocksRemaining": 18973 },
    "permanentPurchaseUnlocked": false,
    "permanentPurchasePrice": 24000
  }
  ```
  ※ price-tier.jsは削除済み。grid.jsに統合（Vercel 12関数上限のため）。

### POST /api/death
- 役割：死亡数インクリメント
### GET /api/death
- 役割：世界累計死亡数取得

### POST /api/stage-logo
- 役割：購入前ロゴ画像を一時保存
- 入力：{session_key, image_data, image_type}
- DB：logo_staging

### POST /api/auth-sync
- 役割：ログイン後にlocalStorageデータをSupabaseに同期
- 入力：{user_id, player_name, total_deaths, best_stage, ...}
- DB：player_profiles

---

## ■11. 称号一覧（確定）

**設計方針：**
- Tier 1：最初の30秒で2〜3個解除 → ドーパミン
- 死亡系は上限なし設計
- ネタ称号はSNS拡散用
- 課金称号はマネタイズに直結
- 取得時はゲーム中にフローティング表示

| Tier | 称号 | 条件 |
|---|---|---|
| 1 | Welcome to Hell | 初回ゲーム起動 |
| 1 | First Death | 初回死亡 |
| 1 | Again. | 2回死亡 |
| 1 | Still Here | 10秒以上生存 |
| 2 | Getting Used to It | 10回死亡 |
| 2 | Not Giving Up | 50回死亡 |
| 2 | Still Playing? | 100回死亡 |
| 2 | Time Sink | 累計5分プレイ |
| 2 | Can't Stop | 累計10分プレイ |
| 3 | First Blood | Stage 2到達 |
| 3 | Getting Somewhere | Stage 5到達 |
| 3 | Double Digits | Stage 10到達 |
| 3 | Getting Serious | Stage 20到達 |
| 3 | One Third | Stage 30到達 |
| 3 | Halfway | Stage 50到達 |
| 3 | Almost There | Stage 70到達 |
| 3 | So Close | Stage 90到達 |
| 3 | Legend | Stage 100到達 |
| 3 | Close One | 残り1秒未満で砂時計取得 |
| 3 | Comeback Kid | 残り5秒以下で新記録到達 |
| 3 | Speed Demon | 3分以内にStage 5到達 |
| 3 | No Baby | Baby Mode未使用でStage 10到達 |
| 3 | Ghost | 1ステージをノーデスでクリア |
| 4 | Persistent | 500回死亡 |
| 4 | Unbreakable | 1,000回死亡 |
| 4 | One Hour Club | 累計60分プレイ |
| 5 | Addicted | 2,000回死亡 |
| 5 | Why Are You Still Playing? | 累計2時間プレイ |
| 5 | There Is No End | 累計5時間プレイ |
| 5 | You Need Help | 5,000回死亡 |
| 5 | Are You OK? | 10,000回死亡 |
| 5 | You Belong Here | 累計10時間プレイ |
| 6 | Stuck in Stage 1 | Stage 1で50回死亡 |
| 6 | Hopeless | Stage 1で100回死亡 |
| 6 | Instant Regret | スタート後3秒以内に死亡 |
| 6 | Speedrun to Death | 1分以内に5回死亡 |
| 6 | Just One More Try | 20連続リトライ |
| 7 | Night Owl | 深夜0時〜5時にプレイ |
| 7 | Back Again | 2回目以降の起動 |
| 7 | I Give Up | Baby Mode起動 |
| 7 | Legend of Giving Up | Baby ModeでStage 20クリア |
| 7 | Masochist | Hard Modeで初死亡 |
| 8 | First Purchase | 初購入 |
| 8 | Grid Owner | 4マス所有 |
| 8 | Expanding Territory | 20マス所有 |
| 8 | Collector | 50マス所有 |
| 8 | Dominator | 200マス所有 |
| 8 | Landlord | 500マス所有 |
| 8 | Monopolist | 1ステージ50%取得 |
| 8 | Stage Conqueror | 1ステージ100%取得 |
| 8 | God of Grid | 複数ステージ制覇 |

---

## ■12. テストプレイ戦略

### フェーズ分け
1. **テストプレイフェーズ**：ゲームの認知のみ。販売は非公開。
2. **正式公開**：販売開始。Stripe本番モード切替。
3. **拡大フェーズ**：配信者アプローチ・企業営業。

### テストプレイURL
`https://neverend.vercel.app?mode=test`

### テストプレイ中は販売・購入システムは非公開
- 宝探し形式：動画説明文にURLを隠す
- テストプレイヤーはクレジット掲載（Googleフォームで申請）

---

## ■13. やることリスト

### テストプレイ公開前チェックリスト（確定版）
- [ ] Stage 1-20 バグ修正完了
- [ ] Supabaseテストデータ削除
- [ ] localStorageリセット確認
- [ ] ログインフロー動作確認（Google + メール）
- [ ] ログインデータのSupabase player_profiles同期確認
- [ ] 販売ページ購入フロー end-to-end テスト
- [ ] Stripe Webhook動作確認
- [ ] Mypageログイン後の表示確認

### 今すぐ（最優先）
- [ ] Stage 5バグ修正（上記の正しいコードで丸ごと置き換え）
- [ ] 販売ページ動作確認（128×72グリッド・新価格体系）
- [ ] ログイン機能動作確認
- [ ] ロゴのゲーム内表示動作確認

### テストプレイ前
- [ ] Stage 4・6・7バグ修正
- [ ] Stage 8-35バグ修正
- [ ] Admin Modeタイマー・BGMバグの原因特定・修正
- [ ] 価格自動値上げシステム実装
- [ ] localStorageリセット確認

### 正式公開直前
- [ ] ドメイン取得（neverend.game）
- [ ] Stripe本番モード切替
- [ ] Supabaseテストデータ削除
- [ ] DMCA登録（約$6）
- [ ] BGM Stage 40以降作成

### 正式公開後
- [ ] Stage 51-100実装
- [ ] 1面独占B方式実装
- [ ] アニメーションGIF対応（1面独占特典）
- [ ] スキン販売システム
- [ ] Cloudflare Pages移行（コスト削減）
- [ ] ドメイン取得（neverend.game）
- [ ] Stripe本番モード切替
- [ ] DMCA登録（約$6）
- [ ] BGM Stage 21以降
- [ ] ランキング機能（将来）
- [ ] 永続購入UI（$7,500ティア到達時にアンロック）

---

## ■14. okakaの思想・重要な判断基準

### プロジェクトの本質
「死にゲーの背景に広告を置く」という唯一無二のコンセプト。プレイヤーが何度も死ぬ→何度もロゴを見る→配信者がプレイすると視聴者も長時間見る。怒れば怒るほど広告効果が上がる逆説的構造。

### ゲームデザインの方針
- 難しめに設計する（簡単すぎると強く指摘される）
- 理不尽ではなく技術で越えられる難しさ
- 死にゲーの本質（死んでStage 1に戻る恐怖）は絶対に変えない
- チェックポイントは設けない（Baby Modeは例外）

### ビジネスの方針
- コストをかけずにバズを狙う
- 認知度が上がってから企業営業
- 配信者1人に刺さればいい
- テストプレイ中に販売システムは非公開

### okakaへの対応で注意すること
- 確認なしで決定事項として進めない
- 「わかりました」と言いながら間違った修正をすることがある（要注意）
- ステージ修正は必ずコードを読んでから指示を出す
- Token消費を気にしている → 指示はファイルで渡して一括実行
- 怒りやすい → 同じミスを繰り返すと強い言葉で指摘される
- 意見を求められたら率直に答える（褒めるだけでは不満）

---

## ■15. 未確定事項

- Admin Modeでステージスキップ時にBGMがかからない・タイマーが初期化されないバグの原因（要調査）
- ジャンプ初速・重力の最適値（okakaが調整中）
- 販売ページの動作確認結果（未確認）
- ログイン機能の動作確認結果（未確認）
- Stage 36-50のバグ状況（未確認）

