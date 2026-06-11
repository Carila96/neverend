# neverEND 完全引き継ぎ仕様書
# 作成日：2026年6月11日
# 対象読者：このゲームを何も知らない開発者・サポート担当者

---

## ■1. このドキュメントの目的

このドキュメントは「neverEND」というブラウザゲームの開発を、何も知らない第三者が即座に引き継いで作業できるようにするための完全仕様書です。

読者はこのドキュメントを読んだ後に以下ができる状態になります：
- バグ修正
- ステージ追加
- 新機能実装
- インフラ設定変更
- 決済フロー確認
- デバッグ

このチャットで行われた全ての作業（ドメイン取得・Stripe本番切替・favicon設定・企業一覧実装など）が含まれています。

---

## ■2. プロジェクト現状

### 全体進捗
- ゲーム完成度：約38%（Stage 1〜38完成、39〜100未完成）
- インフラ・決済：90%完成（本番テスト購入のみ未実施）
- マーケティング機能：60%（SNSシェア・YouTube導線が未実装）

### 完了済み
- ゲーム本体（Stage 1〜38）
- Stripe本番切替・Webhook設定
- damnrun.comドメイン取得・Vercel連携
- 全URLをdamnrun.comに変更（29箇所）
- Supabase OAuth設定（Google認証のみ、Discord削除済み）
- SEO設定（sitemap.xml・robots.txt・メタタグ・Search Console登録）
- favicon設定（全ページ）
- Hall of Legends FOUNDING PARTNERSセクション
- マイページにパートナー情報入力欄（display_name・display_url）
- display_url自動https://補完
- 利用規約に他者偽装禁止追記
- 販売ページのBACK TO GAMEをwindow.close()方式に変更
- OGPメタタグ整備
- Google Search Console登録・サイトマップ送信

### 部分的に完成
- ゲームモード：ベイビー/通常/ハード/管理者/レトロは動くが将来的に再設計予定
- 購入フロー：テスト購入は確認済み、本番実購入は未テスト

### 未実装
- Stage 39〜100
- 新ギミック（水中・ボタン・ceiling活用・focusZones活用）
- SNSシェアボタン
- YouTubeへの導線
- ベイビーモード→通常モード化（100面完成後）
- タイムモード
- 新BGM

### 現在の最優先タスク
**Stage 39〜100の作成とバグ修正（これが最重要）**

---

## ■3. リポジトリ構造

```
C:\neverEND\  （ローカル）
https://github.com/Carila96/neverend  （GitHub）
https://damnrun.com  （本番）

├── index.html              ★ゲーム本体（最重要・約4800行超）
├── vercel.json             Vercel設定
├── package.json            （ほぼ空）
├── sitemap.xml             SEO用サイトマップ（ルート直下）
├── robots.txt              SEO用robots
├── api/                    Vercel Serverless Functions（10ファイル）
│   ├── auth-sync.js        認証同期
│   ├── cancel-reservation.js 予約キャンセル・位置変更・契約キャンセル
│   ├── create-checkout.js  Stripeチェックアウト作成
│   ├── get-contract.js     契約情報取得
│   ├── grid.js             グリッドデータ取得
│   ├── logo.js             ロゴ取得・更新
│   ├── register-tester.js  テスター登録
│   ├── reserve.js          ブロック予約
│   ├── stats.js            統計取得
│   └── webhook.js          Stripe Webhook処理
├── app/
│   └── pages/
│       ├── sales_page.html ★販売ページ（重要・約2200行）
│       ├── mypage.html     ★マイページ（重要・約1800行）
│       ├── halloflegends.html ランキング・企業一覧
│       ├── terms.html      利用規約
│       ├── privacy.html    プライバシーポリシー
│       ├── contact.html    お問い合わせ
│       ├── cancel.html     決済キャンセルページ
│       └── success.html    決済完了ページ
└── public/
    ├── favicon.png         ★faviconアイコン（砂時計+キャラクター）
    ├── og-image.png        OGP画像（neverEND+DAMN!入り）
    ├── og-image.html       OGP画像生成用HTML
    ├── tower.png           タイトル画面の塔画像
    └── hall-of-legends.html （古いファイル・使用確認要）
```

### 触ってはいけないファイル
- `public/favicon.png`：手動でChatGPTと作成した画像、上書き禁止
- `api/webhook.js`：Stripeの本番Webhookが繋がっているため慎重に

### 要確認ファイル
- `public/hall-of-legends.html`：`app/pages/halloflegends.html`との役割分担が不明確

---

## ■4. ファイル責任詳細

### index.html（最重要・ゲーム本体）
- **役割**：HTML/CSS/JS全部入り。ゲームの全ロジックをここに含む
- **行数**：約4800行超
- **最新版**：GitHub mainブランチのものが最新
- **主な構造**（おおよその行番号、変更時は都度確認）：
  - 1〜30行：headタグ、メタタグ、GA4、OGP
  - 〜200行：CSS
  - 〜500行：定数・グローバル変数定義
  - 〜600行付近：STAGES配列（ステージデータ）※巨大
  - 〜3200行付近：drawPlayer（プレイヤー描画）
  - 〜3400行付近：ゲームループ（update/draw）
  - 〜3700行付近：マイページ描画・クリック処理
  - 〜4000行付近：Supabase認証・プレイヤーデータ
  - 〜4600行付近：ログインモーダル・名前入力モーダル
  - 末尾付近：BGM・SE制御
- **壊れやすい箇所**：
  - STAGES配列の構文（カンマ・括弧のズレで全ステージが読み込めなくなる）
  - PowerShellで編集すると特殊文字が文字化けする（後述）
- **修正時の注意**：Claude Codeを使い、git経由で変更すること

### api/webhook.js
- **役割**：Stripeからのイベントを受け取りSupabaseを更新する
- **処理するイベント**：
  - `checkout.session.completed`：購入完了→ブロック確保・contract作成・ロゴ配置
  - `customer.subscription.deleted`：解約→blocks released・placement非アクティブ
  - `invoice.payment_failed`：支払失敗→contract status = past_due
  - `invoice.payment_succeeded`：支払成功→past_due→active復帰
- **冪等性**：stripe_webhook_eventsテーブルで重複チェック済み
- **依存**：STRIPE_SECRET_KEY・STRIPE_WEBHOOK_SECRET・SUPABASE_SERVICE_KEY

### api/cancel-reservation.js
- **役割**：3つの処理を1エンドポイントで担う
  - `action='update_position'`：位置変更（古いブロック削除→新位置insert）
  - `contract_id`のみ：契約キャンセル（Stripe解約→DB更新→blocks released）
  - `session_key`のみ：予約セッションキャンセル
- **注意**：位置変更時に古いブロック削除後の新ブロックinsert失敗でロールバック不可

### api/grid.js
- **役割**：指定stage_idのグリッドデータ（placements）を返す
- **キャッシュ**：5秒キャッシュ実装済み
- **SELECT項目**：contract_id, anchor_x, anchor_y, width, height, image_url, zone_type, is_active

### api/create-checkout.js
- **役割**：Stripeのチェックアウトセッションを作成
- **BASE_URL**：https://damnrun.com（本番）
- **モード**：月額=subscription+interval:month、年額=subscription+interval:year
- **クーポン対応**：discountsパラメータでStripeクーポンID渡し

### api/stats.js
- **役割**：type=death（死亡統計）またはtype=world（ワールド統計）を返す
- **キャッシュ**：5秒キャッシュ

### api/logo.js
- **役割**：action=stageでロゴ取得、action=updateでロゴ更新
- **旧ファイル**：stage-logo.js + upload-logo.jsを統合したもの

### api/reserve.js
- **役割**：ブロック予約
- **特記**：clampedX/Y使用（座標バリデーション）、同一ユーザーの古い予約を自動キャンセル

### app/pages/sales_page.html
- **役割**：企業・個人向けロゴ販売ページ
- **行数**：約2200行
- **主な機能**：グリッド表示・ブロック選択・サイズ選択・ロゴアップロード・クーポン入力・Stripe決済
- **注意**：PowerShellで過去に文字化けが発生したことがある。修正済み（コミット73a4556）
- **BACK TO GAME**：window.close()でタブを閉じる（href="/"ではない）

### app/pages/mypage.html
- **役割**：購入者のマイページ
- **主な機能**：購入履歴表示・ロゴ変更・位置変更・解約・パートナー情報入力
- **パートナー情報**：display_name（50文字）・display_url（200文字、https://自動補完）
  →subscription_contractsテーブルのdisplay_name・display_urlに保存
  →Hall of Legendsに表示

### app/pages/halloflegends.html
- **役割**：ランキング表示・FOUNDING PARTNERSセクション表示
- **表示方法**：index.htmlのholOverlay内にiframeとして表示
- **FOUNDING PARTNERS**：subscription_contractsからdisplay_name IS NOT NULL AND status='active'を取得してステージ別折りたたみ表示

---

## ■5. ゲームコア構造（index.html詳細）

### 初期化フロー
1. DOMContentLoaded
2. Supabaseクライアント初期化
3. ローカルストレージからセーブデータ読み込み
4. プレイヤープロフィール取得（Supabase）
5. タイトル画面表示

### 状態管理
`state`変数で管理：
- `'title'`：タイトル画面
- `'play'`：プレイ中
- `'dead'`：死亡画面
- `'mypage'`：マイページ

### ゲームループ
- `requestAnimationFrame`で駆動
- `update()`：物理演算・衝突判定・タイマー
- `draw()`：描画

### プレイヤー構造（playerオブジェクト）
```javascript
{
  x, y,           // 座標
  vx, vy,         // 速度
  onGround,       // 着地フラグ
  facing,         // 向き（1=右、-1=左）
  walkT,          // 歩行アニメーションタイマー
}
```

### 主要定数・パラメータ（要コード確認、おおよその値）
- 重力：約0.5程度（要確認）
- ジャンプ力：約-12程度（要確認）
- 最大落下速度：約18程度（要確認）
- 移動速度：約4程度（要確認）
- タイマー：ベイビーモード30秒、通常モード30秒
- **パラメータ定義場所**：index.html上部の定数定義セクション（要コード確認）

### STAGESデータ構造
```javascript
{
  name: 'STAGE N',        // 内部名（UIにはFLOOR Nと表示）
  sub: 'サブタイトル',
  plats: [                // プラットフォーム配列
    {x, y, w, h, phantom:true, sinking:true}  // phantom/sinkingはオプション
  ],
  spikes: [{x, y, w, h}],
  goal: {x, y, w, h},
  spawn: {x, y},
  // 以下はオプション
  traps: [{...}],
  fall: [{...}],
  mimics: [{...}],
  chasers: [{...}],
  pendulums: [{...}],
  lava: [{...}],
  move: [{...}],
  darkness: {enabled:true, type:..., interval:..., duration:...},
  scrollY: true,
  orbits: [{...}],
  fallingSpikes: [{...}],
  hg: [{...}],
  ceiling: [{...}],       // 未使用・コード要確認
  focusZones: [{...}],    // 未使用・コード要確認
}
```

### ゲームモード詳細

#### ベイビーモード（easyMode = true）
- 死亡時に30秒にリセット（60秒から変更済み）
- bestStageの更新は現在無効化（!easyModeガード）
  → 将来的にbestStageBabyとして別キーで管理予定
- ベイビーモード100面クリアで通常モード解禁（未実装）

#### 通常モード（デフォルト）
- 死亡で30秒にリセット
- bestStageをlocalStorageに保存

#### ハードモード（hardMode = true）
- キャラクター色が赤系に変化（rgba(255,150,100,0.92)）
- 通常より厳しい設定（要コード確認）
- 隠しコマンド：`hhhhh`で起動（将来的に`time`コマンドに変更予定）

#### 管理者モード（adminMode / testMode）
- テストモード中は販売ボタンが無効化
- ⚡ ADMIN FREE PLACEMENTが表示（sales_page.html）
- 有効化方法：要コード確認（特定キー入力またはURL parameter）

#### レトロモード
- ゲームのビジュアルをレトロ風に変更
- 詳細はコード要確認（drawBg・drawLogoRetroあたりを参照）
- 有効化方法：要コード確認

### UIの重要な仕様
- **FLOOR表示**：UIは全て「FLOOR N」表示。コード内部のname:'STAGE N'は全ステージ完成後に一括置換予定
- **Hall of Legends**：holOverlayというdivにiframeとして表示。タイトル画面右下のクリックで起動
- **販売ページ**：`window.open('_blank')`で新タブ表示
- **マイページ**：ゲームキャンバス上にCanvas描画で実装（HTMLではなくCanvas）
- **ログインモーダル**：index.htmlには`loginModal`（Email/Password対応）、mypage.htmlには`snsLoginModal`（Googleのみ）

### localStorage使用キー
- `neverend_save`：セーブデータ（bestStage等）
- `neverend_playername`：プレイヤー名
- `neverend_world_stats_cache`：ワールド統計キャッシュ

### 実績システム
- `buildAchievements(totalBlocks)`関数で実績を表示
- 実績例：「WARMED UP」（5分プレイ）、「BACK AGAIN」（2回目プレイ）、「20TH FLOOR」等
- マイページ下部に表示

---

## ■6. ゲームギミック一覧と使用状況

| ギミック | 説明 | 使用状況 |
|---------|------|---------|
| traps | 隠しスパイク（条件で出現） | 多数ステージで使用 |
| fall | 落下ブロック | 少数ステージ |
| fallingSpikes | 落下スパイク | 2・3面のみ→久しぶりに使える |
| chasers | 追跡敵 | 中程度 |
| mimics | 爆弾モンスター | 中程度 |
| pendulums | 振り子 | 中程度 |
| lava | 溶岩 | 中程度 |
| move | 移動プラットフォーム | 少ない→もっと使える |
| darkness | 暗闇効果 | 中程度 |
| phantom_plat | 触れると消える床 | 中程度 |
| sinking_plat | 沈む床 | 中程度 |
| scrollY | 縦スクロールモード | 4面のみ（51,61,67,74） |
| orbits | 軌道スパイク | 52面以降で多用 |
| ceiling | 天井トラップ | **未使用・コード要確認** |
| focusZones | フォーカスゾーン | **完全未使用・コード要確認** |
| hg | ハングバー（ぶら下がり） | 使用状況不明・コード要確認 |

### 縦スクロールの注意点
- scrollY:trueのステージでtrapを使う場合、`triggerYUp`パラメータが必要
- drawTrapSpike関数にcameraY考慮を追加済み

### 新ギミック（Stage 40以降で実装予定）
- 水中ステージ（未実装）
- ボタン要素（未実装）
- ceiling・focusZonesの活用

---

## ■7. モード設計（将来の再設計計画）

### 現状→将来のマッピング（100面完成後に実装）
| 現在 | 将来 | 解放条件 |
|-----|-----|---------|
| ベイビーモード | 通常モード（最初から選べる） | なし |
| 通常モード | ハードモード | ベイビーモード100面クリア |
| ハードモード | タイムモード（1分で何階まで） | 要検討 |

### bestStageの将来的な管理方法
- `bestStageBaby`：ベイビーモードの最高フロア
- `bestStageNormal`：通常モードの最高フロア
- DBの`player_profiles`テーブルに`best_stage_baby`カラム追加が必要

### タイムモード仕様（未実装）
- 隠しコマンド`time`で起動
- 開始から1分で強制終了
- 終了時に「最高到達階層」と「終了時点の現在階層」を表示
- 友達同士で競うカジュアルモード

---

## ■8. バグ一覧

### 修正済みバグ
1. **drawTrapSpike縦スクロール未考慮**：cameraY考慮を追加済み
2. **Stage 26 trapのtriggerYUp未設定**：修正済み
3. **reservation_sessionsのanchor_x負値**：clampedX/Y使用で修正済み
4. **同一ユーザーの古いreservedブロックが残る**：自動キャンセル追加済み
5. **gridキャッシュが即時反映されない**：キャッシュ無効化済み
6. **deletedBlocksがステージ選択時にリセット**：修正済み
7. **sales_page.htmlの文字化け**：UTF-8エンコーディングで修正済み（コミット73a4556）
8. **BACK TO GAMEで新しいタブにゲームが開く**：window.close()方式に変更済み

### 現在の既知バグ・問題
1. **GoTrueClient複数インスタンス警告**
   - 症状：F12コンソールに「Multiple GoTrueClient instances detected」
   - 再現：ゲーム←→販売ページを複数回行き来する
   - 原因：Supabaseクライアントが重複初期化
   - 対応：現状許容（リロードで解決）、抜本対応は設計変更が必要

2. **販売ページ行き来でゲームが操作不能になる**
   - 症状：BACK TO GAME繰り返し後、マイページボタンが反応しない
   - URL：https://damnrun.com/#になっている
   - 原因：GoTrueClient重複による認証状態の混乱と考えられる
   - 対応：リロードで解決。BACK TO GAMEをwindow.close()に変更で改善見込み

3. **supabase.co URLがログイン時に表示される**
   - 症状：Googleログイン時にcokcftutqkwhfbmdnhgl.supabase.coが表示
   - 原因：SupabaseのOAuth認証フローの仕様（回避不可）
   - 対応：ログインモーダルに「This is normal and safe」の注記を追加済み
   - 完全解決：Supabase Pro（$25/月）でカスタムドメイン設定が必要

4. **テストデータがworld_statsに残っている**
   - 対応：将来的にリセット予定

---

## ■9. 既知の問題エリア・AIが誤解しやすい点

### PowerShellでの文字化け（最重要）
- **問題**：PowerShellのSet-ContentやOut-Fileはデフォルトでcp932エンコーディングを使用
- **症状**：em-dash（—）・矢印（→←↑）・絵文字（💡⚡✓）・×が「?」または「?~」に変化
- **正しい方法**：
  ```powershell
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
  ```
- **禁止**：`Set-Content`・`Out-File`をエンコーディング指定なしで使用すること

### iframeと親ウィンドウの混乱
- halloflegends.htmlはiframeとして表示される
- iframeから親ウィンドウを操作するには`window.parent.document.getElementById(...)`
- mypage.htmlもiframe内で動く場合がある
- 販売ページはwindow.open('_blank')なのでiframe問題は発生しない

### SupabaseのRLS（行レベルセキュリティ）
- 新しいテーブル操作を実装する際は必ずRLSポリシーを確認・追加すること
- 204 No Contentが返ってもデータが更新されていない場合がある→RLSが原因
- 確認方法：Supabase SQL Editorで直接SELECT

### Vercel Hobby planの制限
- Serverless FunctionsのAPIファイルは12個まで（現在10個）
- これ以上増やす場合は既存ファイルとの統合が必要

### STAGES配列の構文エラー
- index.htmlのSTAGES配列はJavaScriptのオブジェクト配列
- カンマ・括弧のズレで全ステージが読み込めなくなる
- 修正後は必ずブラウザで開いてゲームが起動するか確認

### ゲーム内のFLOOR/STAGE混在
- UIは全て「FLOOR N」表示（正しい）
- コード内部のname:'STAGE N'はそのまま（内部データのため影響なし）
- 全ステージ完成後に一括置換予定

---

## ■10. 機能ステータステーブル

| 機能 | ステータス | 関連ファイル | 問題 | 次のアクション | 優先度 |
|-----|----------|------------|-----|-------------|-------|
| ゲーム本体Stage 1-38 | 完了 | index.html | なし | - | - |
| ゲーム本体Stage 39-100 | 未実装 | index.html | - | ステージ作成 | 最高 |
| 新ギミック（水中・ボタン） | 未実装 | index.html | - | 実装 | 高 |
| Stripe決済（月額・年額） | 完了 | create-checkout.js, webhook.js | 本番テスト未実施 | テスト購入 | 高 |
| ロゴアップロード・配置 | 完了 | logo.js, sales_page.html | - | - | - |
| 位置変更・画像変更 | 完了 | cancel-reservation.js | - | - | - |
| 解約 | 完了 | cancel-reservation.js, webhook.js | - | - | - |
| Hall of Legends | 完了 | halloflegends.html | - | - | - |
| FOUNDING PARTNERS | 完了 | halloflegends.html, mypage.html | - | - | - |
| Google認証 | 完了 | index.html, mypage.html, sales_page.html | supabase.co URL表示 | 許容 | - |
| ベイビーモード→通常モード化 | 未実装 | index.html | 100面未完成 | 100面完成後 | 中 |
| タイムモード | 未実装 | index.html | - | 100面完成後 | 中 |
| SNSシェアボタン | 未実装 | index.html | - | 実装 | 中 |
| YouTube導線 | 未実装 | index.html | - | 実装 | 中 |
| favicon | 完了 | public/favicon.png | - | - | - |
| OGP画像 | 部分完了 | public/og-image.png | neverEND+DAMN!入り画像への差し替えが必要 | 差し替え | 低 |
| SEO | 完了 | sitemap.xml, robots.txt, index.html | - | - | - |
| 本番クーポン | 未実装 | Stripe Dashboard | 知人交渉時に作成 | 後で | 低 |
| world_statsリセット | 未実施 | Supabase | テストデータあり | 後で | 低 |
| 特定商取引法記載 | 未実施 | terms.html | 販売業者名空欄 | 記入 | 中 |

---

## ■11. API仕様

### POST /api/auth-sync
- **役割**：ログイン時にSupabaseのプレイヤープロフィールを同期
- **呼び出し元**：index.html（ログイン後）
- **DB**：player_profilesテーブル

### POST /api/reserve
- **役割**：グリッドのブロックを一時予約
- **入力**：stage_id, anchor_x, anchor_y, width, height, user_id
- **特記**：同一ユーザーの古い予約を自動キャンセル、座標clamp処理あり
- **DB**：reservation_sessions, owned_blocks

### POST /api/create-checkout
- **役割**：Stripeチェックアウトセッション作成
- **入力**：stage_id, anchor_x, anchor_y, width, height, plan_type, coupon_id等
- **出力**：Stripe Checkout URL
- **BASE_URL**：https://damnrun.com
- **モード**：subscription（月額・年額どちらも）
- **DB**：直接は操作しない（webhook経由）

### POST /api/webhook
- **役割**：Stripeイベント処理
- **署名検証**：STRIPE_WEBHOOK_SECRETで検証
- **冪等性**：stripe_webhook_eventsで重複チェック
- **処理フロー（checkout.session.completed）**：
  1. reservation_sessions検索
  2. owned_blocksをclaimedに更新
  3. subscription_contracts insert
  4. blocksにcontract_id紐付け
  5. logo_stagingがあればSupabase Storageにアップロード→placements insert
  6. reservation_sessionsをcompletedに

### GET /api/grid
- **役割**：stage_id指定でグリッドデータ取得
- **キャッシュ**：5秒
- **出力**：placements配列（contract_id, anchor_x, anchor_y, width, height, image_url, zone_type, is_active）

### GET|POST /api/logo
- **役割**：action=stageでロゴ取得、action=updateでロゴ更新
- **旧名**：stage-logo.js + upload-logo.js を統合

### GET /api/stats
- **役割**：type=deathで死亡統計、type=worldでワールド統計
- **キャッシュ**：5秒

### POST /api/cancel-reservation
- **役割**：3パターンの処理
  1. `action='update_position'`：位置変更
  2. `contract_id`のみ：契約解約
  3. `session_key`のみ：予約キャンセル

### GET /api/get-contract
- **役割**：契約情報取得

### POST /api/register-tester
- **役割**：テストプレイヤー登録

---

## ■12. インフラ詳細

### Vercel
- **プラン**：Hobby（無料）
- **自動デプロイ**：GitHubのmainブランチにpushで自動デプロイ
- **APIファイル上限**：12個（現在10個、余裕2個）
- **環境変数**（Vercel Dashboardで設定）：
  - `STRIPE_SECRET_KEY`：本番シークレットキー（sk_live_...）
  - `STRIPE_WEBHOOK_SECRET`：Webhook署名シークレット（whsec_...）
  - `SUPABASE_URL`：https://cokcftutqkwhfbmdnhgl.supabase.co
  - `SUPABASE_SERVICE_KEY`：Supabaseサービスキー

### Stripe
- **モード**：本番（Live）に切替済み
- **Webhookエンドポイント**：https://damnrun.com/api/webhook
- **受信イベント**：checkout.session.completed, customer.subscription.deleted, invoice.payment_failed, invoice.payment_succeeded
- **テストクーポン（サンドボックス）**：NEVER99A（99%オフ）
- **本番クーポン**：未作成（知人交渉時に作成予定、90%オフ等）
- **注意**：本番モードのためテスト購入不可。テスト時はStripe DashboardでSandboxに切替必要

### Supabase
- **プロジェクトID**：cokcftutqkwhfbmdnhgl
- **プラン**：Free
- **認証**：Googleのみ（Discordは削除済み）
- **Site URL**：https://damnrun.com
- **Redirect URLs**：
  - https://damnrun.com
  - https://damnrun.com/app/pages/sales_page.html
  - https://damnrun.com/app/pages/mypage.html
  - https://neverend.vercel.app/**（旧URL、残存）

### Supabaseテーブル構成

#### subscription_contracts
```
id, user_id, plan_type, zone_type, stripe_subscription_id, stripe_customer_id,
stripe_session_id, status, block_count, base_price_usd, monthly_total_usd,
current_period_start, current_period_end, canceled_at, created_at, updated_at,
stage_id, anchor_x, anchor_y, width, height,
display_name (追加済み), display_url (追加済み)
```

#### RLSポリシー（subscription_contracts）
- `users read own contracts`：SELECT、auth.uid() = user_id
- `Users can update own contracts display info`：UPDATE、auth.uid() = user_id
- `Anyone can read display info`：SELECT、display_name IS NOT NULL AND status = 'active'

#### owned_blocks
- ブロックの所有情報
- status: 'claimed', 'released', 'reserved'等

#### reservation_sessions
- 予約セッション情報
- anchor_xは負値禁止（clamp済み）

#### placements
- ロゴ配置情報
- image_url：Supabase Storageへの参照

#### player_profiles
- プレイヤープロフィール
- 将来的にbest_stage_babyカラム追加が必要

#### test_players
- テストプレイヤー（Hall of Legendsのテスト用）
- world_statsにテストデータが残っている→将来リセット予定

### Cloudflare
- **ドメイン**：damnrun.com（Registrar）
- **自動更新**：ON（年$10.46）
- **DNS**：VercelへのCNAMEをAuto Configureで設定済み
- **SSL**：Cloudflare提供の無料SSL

### Google Cloud Console
- **プロジェクト**：neverEND
- **OAuthクライアント**：設定済み
- **承認済みJavaScript生成元**：https://damnrun.com, https://neverend.vercel.app
- **承認済みリダイレクトURI**：https://cokcftutqkwhfbmdnhgl.supabase.co/auth/v1/callback
- **サポートメール**：carila.land96@gmail.com（新規作成したCarilaブランド用アカウント）
- **デベロッパー連絡先**：carila.land96@gmail.com

### Google関連アカウント
- **開発者個人アカウント**：clockcrokk0969@gmail.com
- **Carilaブランドアカウント**：carila.land96@gmail.com（Google Cloud等の表示用）
- **Google Analytics**：G-NKYLSSDJN6

### SEO
- **Google Search Console**：damnrun.com登録済み・サイトマップ送信済み
- **sitemap.xml**：https://damnrun.com/sitemap.xml
- **robots.txt**：https://damnrun.com/robots.txt

---

## ■13. データフロー

### 購入フロー
```
[ゲーム] マイページ→CLAIM YOUR SPACE
  ↓ window.open('_blank')
[sales_page.html] グリッド表示
  ↓ ブロック選択
  ↓ /api/reserve でブロック予約
  ↓ ロゴアップロード（base64→メモリ保持）
  ↓ /api/create-checkout でStripeセッション作成
  ↓ Stripe Checkout画面へリダイレクト
  ↓ 決済完了
  ↓ /api/webhook (checkout.session.completed)
    → owned_blocks: claimed更新
    → subscription_contracts: insert
    → placements: insert（ロゴあれば）
    → reservation_sessions: completed
  ↓ success.htmlへリダイレクト
```

### 解約フロー
```
[mypage.html] 解約ボタン
  ↓ /api/cancel-reservation (contract_id)
    → Stripe subscriptions.cancel
    → subscription_contracts: canceled
    → owned_blocks: released
    → placements: is_active=false
```

### 位置変更フロー
```
[mypage.html] 位置変更
  ↓ /api/cancel-reservation (action='update_position')
    → 古いブロック削除
    → 新位置にinsert
    → contract/placementsのanchor更新
```

### 死亡フロー
```
[index.html] プレイヤー死亡
  ↓ /api/stats (type=death) でDB更新
  ↓ dead状態へ
  ↓ タイマーリセット（ベイビー/通常モードで処理分岐）
  ↓ bestStage更新チェック
```

---

## ■14. 環境構築・デプロイ

### ローカル環境
- **必要ツール**：Claude Code、Git、Node.js（任意）
- **ローカルパス**：C:\neverEND
- **起動確認**：`index.html`をブラウザで直接開く（ただしAPI呼び出しは本番向き）

### デプロイ方法
```
git add -A
git commit -m "変更内容"
git push origin main
```
→GitHubのmainブランチにpushするとVercelが自動デプロイ
→デプロイ後30秒〜1分で反映

### 重要：ファイル編集時のエンコーディング
PowerShellでファイル編集する場合は必ず以下を使用：
```powershell
$bytes = [System.IO.File]::ReadAllBytes($file)
$content = [System.Text.Encoding]::UTF8.GetString($bytes)
# 編集処理
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $newContent, $utf8NoBom)
```

### デプロイ後の確認チェックリスト
- [ ] https://damnrun.com でゲームが起動するか
- [ ] ブラウザタブにfaviconが表示されるか
- [ ] Googleログインが機能するか
- [ ] Hall of Legendsが開くか

---

## ■15. テスト戦略

### テスト済み
- ゲーム動作（Stage 1〜38）
- テスト購入（Stripeサンドボックス）
- ロゴアップロード・表示
- 位置変更・画像変更
- 解約フロー
- Googleログイン
- Hall of Legends表示
- FOUNDING PARTNERS表示・保存

### 未テスト
- **本番での実購入**（最重要・早急にテスト必要）
- Stage 39〜100
- 決済失敗時の動作（invoice.payment_failed）
- 年額サブスク自動更新時の動作
- 大量ユーザー同時アクセス時の動作

### 本番テスト購入の方法
- Stripeダッシュボードで本番クーポン作成（90%オフ等）
- 実際の決済でフローを確認
- 購入後にSupabaseでデータが正しく入っているか確認

---

## ■16. タスクリスト

### 即座に着手
- [ ] Stage 39〜100作成（最優先）
- [ ] ceiling・focusZonesギミックのコード確認
- [ ] 新ギミック（水中・ボタン）の実装（Stage 40以降）

### ゲーム完成前に実施
- [ ] 新BGM作成
- [ ] 全ステージのバグチェック
- [ ] コード内STAGE→FLOOR一括置換（全ステージ完成後）

### ゲーム完成後（マーケティング）
- [ ] ベイビーモード→通常モード化実装
- [ ] タイムモード実装
- [ ] SNSシェアボタン実装
- [ ] YouTubeへの導線追加
- [ ] 本番クーポン作成（知人交渉時）
- [ ] 本番での購入テスト

### インフラ・運用
- [ ] OGP画像をneverEND+DAMN!入り画像に差し替え（画像はpublic/favicon.pngとして保存されているが別途OGP用が必要）
- [ ] world_statsリセット（テストデータ削除）
- [ ] 特定商取引法の販売業者名記入（terms.html）
- [ ] 永久購入実装時に利用規約追記
- [ ] contact.htmlデザイン改善
- [ ] Vercelファイル整理（10→8個：get-contract+create-checkout→checkout統合等）

---

## ■17. 未決定事項

| 項目 | 状況 | 必要な情報 |
|-----|-----|----------|
| ベイビーモード解禁条件の詳細UI | 未設計 | タイトル画面の2択UIデザイン |
| タイムモードのスコア保存先 | 未設計 | DBスキーマ追加が必要 |
| 100面到達者限定クーポンの仕組み | 未設計 | Stripe連携方法 |
| スキン販売の実装方法 | 未設計 | 要設計 |
| 賞金制度の仕組み | 未設計 | 要設計 |
| ceiling・focusZonesのコード内実装状況 | 未確認 | index.htmlを確認 |
| world_statsのリセットタイミング | 未定 | オカカさんの判断 |

---

## ■18. 重要注意事項

### 絶対にやってはいけないこと
1. PowerShellの`Set-Content`や`Out-File`をエンコーディング指定なしで使う→文字化け
2. Vercelの環境変数を直接ファイルにハードコードする
3. `public/favicon.png`を上書きする（手作業で作成した重要な画像）
4. Stripe本番のWebhookエンドポイントを削除する

### 作業前チェックリスト
- [ ] Claude Codeを使ってGitHub経由で変更する
- [ ] 大きな変更前にgit pullで最新を取得する
- [ ] PowerShellで大量置換する場合はUTF-8エンコーディングを明示する
- [ ] STAGES配列を変更した後はブラウザでゲームが起動するか確認する

---

## ■19. コード参照ガイド（次の担当者向け）

### まず確認すべきファイルと順序
1. **index.html**：ゲーム全体の理解のため最初に見る。特にSTAGES配列とgameloop
2. **api/webhook.js**：購入フローを理解するために必須
3. **app/pages/sales_page.html**：販売フロー確認用
4. **app/pages/mypage.html**：ユーザー管理確認用

### ステージを追加・修正する場合
- **参照**：index.html のSTAGES配列
- **ルール**：16pxグリッド基準、width/heightは16の倍数
- **座標系**：左上原点、x=0が左端、y=0が上端
- **ゴール**：通常は右側または上部に配置
- **スポーン**：通常は左下付近
- **修正後確認**：ブラウザでそのステージをプレイして動作確認

### 購入フローをデバッグする場合
- **参照**：api/webhook.js → api/create-checkout.js → api/reserve.js
- **DB確認**：Supabase SQL Editorでsubscription_contracts・owned_blocks・placementsを確認
- **Stripe確認**：Stripeダッシュボードのイベントログ確認

### 認証関連をデバッグする場合
- **参照**：index.htmlのloginWithGoogle関数、mypage.htmlのloginWith関数
- **Supabase確認**：Authentication→URL Configuration設定確認
- **Google Cloud確認**：OAuth同意画面→承認済みURI確認

---

## ■20. 最終サマリー

### 現在の状態
- ゲームは公開済み（https://damnrun.com）
- Stage 1〜38完成、39〜100未完成
- 決済・認証・インフラは本番稼働中
- FOUNDING PARTNERSなどマーケティング機能も実装済み
- 本番での実購入テストが未実施

### ブロッカー
- Stage 39〜100が未完成のため、知名度向上活動・知人への営業ができない状態

### 次のステップ
1. ceiling・focusZonesのコード確認（index.htmlで検索）
2. Stage 39から順番にステージを作成
3. 新ギミック（水中・ボタン）をStage 40以降で導入
4. 100面完成後に本番購入テスト・知人への営業開始

### このドキュメントで不明な点
- ceilingギミックの実装状況（index.htmlのdrawCeiling関数付近を確認）
- focusZonesの実装状況（index.htmlのfocusZones処理を確認）
- hgギミック（ハングバー）の使用ステージ一覧（要確認）
- 各モードの有効化コマンドの詳細（要コード確認）
- 正確なゲームパラメータ値（要コード確認）


---

## ■補足：コード確認済み詳細情報

### 物理パラメータ（index.html 3880-3885行）
専用の定数定義ブロックはなく、ゲームループ内に直接ハードコード：

| 項目 | 値 | 行番号 |
|-----|---|-------|
| 移動速度 | ±5.5 (vx) | 3880-3881 |
| ジャンプ力 | -18.2 (vy) | 3883 |
| 重力 | +0.9/frame | 3884 |
| 最大落下速度 | 20 | 3885 |
| 摩擦（地上減速） | 0.75（ステージ毎にfrictionで上書き可） | 3882 |

画面・時間定数（index.html 241-242行）：
```javascript
const W=1280, H=720, MAX_TIME=60;
const GRID_W=40, GRID_H=22, CELL=32;
```

### モード有効化条件（コード確認済み）

フラグ宣言（482行）：
```javascript
let adminMode=false, hardMode=false, retroMode=false, easyMode=false, inputBuf=[];
```

| モード | 有効化条件 | 行番号 |
|-------|----------|-------|
| testMode | URLパラメータ`?mode=test`または`?test=1`または`?test=true`、またはsessionStorageに保存済み | 520-522 |
| adminMode | タイトル画面で↑↑↓↓←→←→b a 1 9 8 4 入力（トグル） | 588 |
| retroMode | タイトル画面でrを5回（トグル） | 591 |
| hardMode | タイトル画面でhを5回（トグル） | 590 |
| easyMode（ベイビー） | タイトル画面でgiveup入力（トグル） | 592 |

**注意**：adminMode有効化後はTabキーでtoggleAdminPanel()が呼ばれる。
**注意**：モード入力はtitle状態でのみ受け付ける。

### ceilingギミック（コード確認済み）
- **セットアップ**：2939行
- **処理**：3959-3967行
- **描画関数**：drawCeilingTrap()、3231-3246行
- **描画呼び出し**：4581行

挙動：`player.x > c.tx`でトリガー → warnがtrueなら0.5秒黄色警告 → timer<=0で当たり判定（赤）→ trap死亡

```javascript
// ステージデータへの記述例
ceiling: [{x:400, y:0, w:80, h:40, tx:200, warn:true}]
// tx: このX座標をプレイヤーが超えたらトリガー
// warn: trueで警告表示あり（0.5秒）
```

### focusZones（コード確認済み）
**完全未実装**。処理・描画コードが存在しない。全ステージで空配列`[]`として宣言されているのみ。将来用に予約されたフィールド。実装するには0からコードを書く必要がある。

### hg（砂時計アイテム）ギミック（コード確認済み）
- **役割**：プレイヤーが触れると時間+5秒、スコア+50
- **セットアップ**：2924行
- **処理**：3933-3938行
- **描画関数**：drawHourglass()、3192-3202行
- **描画呼び出し**：4579行

```javascript
// ステージデータへの記述例
hg: [{x:448, y:608, w:16, h:32}]
// 標準サイズはw:16, h:32
```

挙動：触れると`timeLeft+5`（上限MAX_TIME=60）、`score+50`、`+5s!`フロート表示・効果音。残り1秒未満で取るとcloseGrabs統計加算。

### ステージ記述の実例（STAGE 1・STAGE 2）

**STAGE 1（index.html 609-619行）**：
```javascript
{name:'STAGE 1', sub:'The floor lies.',
 plats:[{x:0,y:640,w:1280,h:80},{x:480,y:576,w:96,h:16}],
 spikes:[{x:528,y:544,w:32,h:32}],
 traps:[
   {x:320,y:608,w:32,h:32,tx:192,warn:false},
   {x:832,y:608,w:32,h:32,tx:704,warn:false},
 ],
 fall:[], move:[], mimics:[], ceiling:[], fallingSpikes:[], lava:[], pendulums:[],
 chasers:[], focusZones:[], darkness:{enabled:false},
 hg:[{x:448,y:608,w:16,h:32},{x:960,y:608,w:16,h:32}],
 goal:{x:1184,y:528,w:80,h:112}, spawn:{x:48,y:592}}
```

**STAGE 2（index.html 621-638行）**：
```javascript
{name:'STAGE 2', sub:'Stairs go up. You go down.',
 plats:[
   {x:0,y:640,w:192,h:80},
   {x:224,y:592,w:128,h:16},
   ...
 ],
 spikes:[{x:224,y:560,w:32,h:32}],
 traps:[{x:464,y:512,w:32,h:32,tx:384,warn:false}],
 fall:[{x:608,y:496,w:128,h:16,spikesOn:false}],
 fallingSpikes:[{x:816,y:0,w:32,h:48,triggerX:740,speed:420,triggered:false,startY:0,currentY:0}],
 hg:[{x:320,y:560,w:16,h:32}],
 goal:{x:1168,y:240,w:64,h:112}, spawn:{x:48,y:592}}
```

### ステージ記述ルール（実例から確認済み）
- 座標は全て16px単位（16の倍数）
- 画面サイズ：W=1280, H=720
- spawnは通常左下付近（x:48, y:592付近）
- goalは通常右側または上部
- 全ギミック配列を空でも必ず記述する（省略しない）
- darknessは`{enabled:false}`または`{enabled:true, type:..., interval:..., duration:...}`
- trapsのtx：プレイヤーがこのX座標を超えたらトリガー
- fallingSpikesのtriggerX：同様にX座標でトリガー
- hgの標準サイズ：w:16, h:32

