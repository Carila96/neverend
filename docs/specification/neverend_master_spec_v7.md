# neverEND 完全仕様書 v7.0
**最終更新：2026-04-20**
**新チャット引き継ぎ用・全文読むこと**

---

## ⚠️ Claudeへの最重要注意事項

- 行動する前に必ず確認する
- 要約・省略しない
- okakaさんの指摘は全文そのまま保存する
- **ステージ修正前に必ずコードを読んで現在の値を確認する**
- **推測で座標を指定しない**
- ClaudeCodeにはplats・spikes・traps・fallingSpikesブロックを丸ごと置き換えさせる
- 修正後に必ずStageデータを表示して確認させてから次に進む

---

## 1. 環境・ファイル構成

| 項目 | 内容 |
|---|---|
| ローカルパス | C:\neverEND（全ファイルここに保存） |
| ゲーム本体 | C:\neverEND\index.html |
| 販売ページ | C:\neverEND\app\pages\sales_page.html |
| APIファイル | C:\neverEND\api\（Vercel Hobby上限12個） |
| マイページ | C:\neverEND\app\pages\mypage.html |
| 指示ファイル置き場 | C:\neverEND\ |
| デプロイ | cd C:\neverEND && npx vercel --prod |
| GitHub | Carila96/neverend（mainブランチ） |
| 本番URL | https://neverend.vercel.app |
| Supabase | cokcftutqkwhfbmdnhgl.supabase.co |
| 予定ドメイン | neverend.game（正式公開直前） |

### Vercel APIファイル（12個上限厳守）
cancel-reservation.js, create-checkout.js, death.js, grid.js, register-tester.js, reserve.js, session-log.js, stage-logo.js, upload-logo.js, webhook.js, world-stats.js, auth-sync.js

**⚠️ APIファイルを追加する場合は既存ファイルを削除または統合すること**

### Claude Codeへの指示方法
- 指示ファイル（.txt）をC:\neverENDに保存
- Claude Codeに「C:\neverEND\ファイル名.txt を読んで、その内容を全て実行してください」と送る
- 長い指示はtxtファイル経由で渡す
- 途中停止時：`Check git log --oneline -3 and continue`
- JSONパース：Pythonは使えない、Node.jsパイプを使う

---

## 2. プロジェクト概要

**neverEND**はブラウザ死にゲー×ゲーム背景グリッド月額広告販売のWebサービス。

- ブランド：Carila（高橋一暉、日本在住個人事業主）

### キャッチコピー（確定）
- Nobody finishes this game. But everybody sees your logo.
- A bad run for them. Free exposure for you.
- How far can you get in 1 hour?

---

## 3. ゲーム仕様

### モード（確定）
| モード | 起動方法 | 内容 |
|---|---|---|
| 通常 | デフォルト | 30秒 |
| Hard Mode | HHHHH | 25秒、警告なし |
| Baby Mode | GIVEUP | 60秒、セーブあり |
| **Admin Mode** | **↑↑↓↓←→←→BA1984** | スキップ可、統計カウントなし、称号付与なし |
| Retro Mode | RRRRR | CRTオーバーレイ |

### ステージ構成
- 現在：Stage 1-50実装済み（バグ修正中）
- 5の倍数ステージ：細分化面
- Hall of Legends：世界初クリア者永久掲載（スクリーンショット申告制）

---

## 4. グリッド仕様（確定）

**⚠️ 重要：ゲームエンジンは16×16pxのまま変更しない。広告グリッド表示のみ変更。**

| 面の種類 | 対象 | ブロックサイズ | グリッド | 総マス数 |
|---|---|---|---|---|
| 通常面 | 5の倍数以外 | 8×8px | 160×90 | 14,400マス |
| 細分化面 | 5の倍数 | 4×4px | 320×180 | 57,600マス |

Supabaseのowned_blocks制約：stage_id%5で通常/細分化を判別、x/y上限変更済み。

---

## 5. 価格体系（全確定）

### 1面独占価格（自動値上げ）
| 段階 | 通常面 | 細分化面 | トリガー |
|---|---|---|---|
| ローンチ | $3,000/月 | $3,300/月 | 開始時 |
| 第2段階 | $5,000/月 | $5,500/月 | 累計売上$1,000 |
| 第3段階 | $7,500/月 | $8,250/月 | 累計売上$5,000 |
| 上限 | $10,000/月 | $11,000/月 | 累計売上$20,000 |

### 1マス単価（ローンチ）
- 通常面：$0.208/マス
- 細分化面：$0.057/マス

### 最低購入・割引
- 通常面最低：4マス
- 細分化面最低：32マス
- 最低決済金額：$5
- 200-499マス：-10%
- 500-999マス：-20%
- 1,000+マス：-30%

### 早期購入者特典
- 有料購入者最初の20人（身内・無料配布除く）
- 永久価格固定（解約で消滅、譲渡不可）

### 1面独占B方式（テストプレイ後実装）
- 既存購入者がいても購入可能
- 空き70-89%：-5%、空き50-69%：-10%
- 既存購入者解約時は1面購入者に自動移行

---

## 6. 販売ページ現状（v3完全版・デプロイ済み）

### 実装済み機能
- 画像アップロード（正方形キャンバス・透明余白・ズーム・ドラッグパン）
- サイズ選択（TINY/SMALL/MEDIUM/LARGE/XL/FULL STAGE/CUSTOM）
- 色編集（ブラシサイズ1/3/5px・ズーム・グループ別パレット・カスタムカラー追加）
- ステージ選択（ネオン中抜きアウトライン・価格表示）
- Place on Grid（マップ背景表示・EDIT BLOCKSモード・ドラッグ削除・UNDO）
- CONFIRM & PURCHASE（フィルタ込みインゲームプレビュー）
- stats-bar下に解像度バー

### 価格プリセット
- TINY：4-20blocks $5〜
- SMALL：~100blocks
- MEDIUM：~500blocks -20%
- LARGE：~2000blocks -30%
- XL：~5000blocks -30%
- FULL STAGE：$3,000〜$3,300
- CUSTOM：自由入力

### 未完成・修正待ち
- 衝突ブロックをEDIT BLOCKSで削除して解消するフロー（isDeletedがスタブのまま）
- FULL STAGEは他サイズと同じフロー（画像アップロード→変換→色編集→配置）

---

## 7. ステージバグ（修正待ち）

### Stage 5（最優先・座標確認済み）

**現在のコード（最新コミット時点）：**
```javascript
plats:[
  {x:0,y:656,w:1280,h:64},        // floor
  {x:0,y:160,w:1280,h:32},        // ceiling
  {x:640,y:160,w:32,h:192},       // wall top
  {x:640,y:448,w:32,h:208},       // wall bottom
  {x:0,y:160,w:32,h:496},         // left wall
  {x:480,y:192,w:160,h:16},       // 上段左足場
  {x:672,y:192,w:160,h:16},       // 上段右足場
  {x:480,y:496,w:160,h:16},       // 下段左足場
  {x:672,y:496,w:160,h:16},       // 下段右足場
],
spikes:[
  {x:128,y:624,w:32,h:32},
  {x:800,y:624,w:32,h:32},
  {x:832,y:624,w:32,h:32},
  {x:864,y:624,w:32,h:32},
  {x:480,y:464,w:32,h:32},
  {x:512,y:464,w:32,h:32},
  {x:672,y:464,w:32,h:32},
  {x:704,y:464,w:32,h:32},
],
traps:[],
fallingSpikes:[
  {x:352,y:160,w:32,h:48,triggerX:800,speed:480,triggered:false,startY:160,currentY:160},
  {x:496,y:160,w:32,h:48,triggerX:900,speed:480,triggered:false,startY:160,currentY:160},
],
spawn:{x:1200,y:608}, goal:{x:48,y:528,w:64,h:128}
```

**okakaの要求（全文）：**
- 足場は真ん中の壁を挟んで左右2個ずつ計4個にする
- 一番床に近い足場（左右各1個）にだけスパイクを置く（透明スパイクなおよし）
- fallingSpikes：プレイヤーは右(x:1200)から左へ移動するので、triggerXはスパイクのxより右の値に設定
- x:352のspike→triggerX:624
- x:496のspike→triggerX:768
- **修正前に必ずコードを読んで確認してから修正すること**

**残課題：**
- 足場が2つしか表示されていない
- fallingSpikesが早期発動している

**別途発生中のバグ（Stage 5修正とは無関係の可能性）：**
- ジャンプ速度低下
- Admin Modeタイマーが減らない
- 次チャットでgit logで原因コミットを特定すること

### その他ステージバグ（全文）
```
Stage 4：動く足場2個を逆方向・速度を統一してもう少し速く・切り返しも速く
Stage 6：ゴールをゴール下の足場からジャンプしないと届かない高さに移動
Stage 7：ゴール左側の床から生えている見えないトゲを3個（浮かない）
Stage 8：ゴールにスパイク被り（共通修正で解決済み確認要）
Stage 11：スパイクが少ない
Stage 13：最終足場のスパイク位置調整
Stage 14：スパイクが機能していない
Stage 15：ミミックの形が変、ミミックに届かない、マップ左半分しか使っていない
Stage 17：中央に足場必要、砂時計がゴールと重複
Stage 18：スパイクを床の上に置く、スパイク数を減らして復帰できるように
Stage 20：動く足場と静的足場が重なっている
Stage 22：開始位置のスパイクが床に正しく置かれていない
Stage 24：指示していない浮きスパイクを削除
Stage 27：落下スパイクのタイミング調整・天井を下げる・一本道でなく段差を作る
Stage 29：別のほぼ同じマップが存在・バリエーション追加
Stage 31：ゴールへの道となる足場がない
Stage 32：足場の配置が悪くジャンプで届かない
Stage 33：プレイヤーが境界ボックス内からスタート・調整必要
Stage 34：スタート位置にスパイクを置かない
Stage 35：ミミック踏んだ後の逃げ場がない
共通：振り子の当たり判定が消える瞬間がある（修正済みのはずだが要確認）
共通：一本道・二択で簡単な方が常に有効なマップが多い→複雑なルートを強制する
共通：見た目が簡単そうなルートに隠しトゲを置く
```

---

## 8. やることリスト

### テストプレイ前（最優先）
- [ ] Stage 5修正（座標確認済み・上記仕様通りに）
- [ ] Stage 4・6・7修正
- [ ] Stage 8-35バグ修正
- [ ] ジャンプ速度低下バグの原因特定・修正
- [ ] Admin Modeタイマーバグの原因特定・修正
- [ ] 販売ページ衝突ブロック削除フロー完成
- [ ] 販売ページ動作確認（画像→ドット化→配置→購入→反映）
- [ ] localStorageリセット

### 正式公開直前
- [ ] ドメイン取得（neverend.game）
- [ ] Stripe本番モード切替
- [ ] Supabaseテストデータ削除
- [ ] DMCA登録（約$6）
- [ ] BGM Stage 40以降作成

---

## 9. 称号一覧（確定）

Tier 1（即達成）: Welcome to Hell, First Death, Again., Still Here
Tier 2（継続）: Getting Used to It, Not Giving Up, Still Playing?, Time Sink, Can't Stop
Tier 3（成長）: First Blood(S2), Getting Somewhere(S5), Double Digits(S10), Getting Serious(S20), One Third(S30), Halfway(S50), Almost There(S70), So Close(S90), Legend(S100), Close One, Comeback Kid, Speed Demon, No Baby, Ghost
Tier 4（やり込み）: Persistent(500死), Unbreakable(1000死), One Hour Club
Tier 5（狂気）: Addicted(2000死), Why Are You Still Playing?(2h), There Is No End(5h), You Need Help(5000死), Are You OK?(10000死), You Belong Here(10h)
Tier 6（ネタ）: Stuck in Stage 1(S1で50死), Hopeless(S1で100死), Instant Regret(3秒以内死), Speedrun to Death(1分で5死), Just One More Try(20連続リトライ)
Tier 7（プレイ状況）: Night Owl, Back Again, I Give Up, Legend of Giving Up, Masochist
Tier 8（課金）: First Purchase, Grid Owner(4マス), Expanding Territory(20マス), Collector(50マス), Dominator(200マス), Landlord(500マス), Monopolist(50%取得), Stage Conqueror(100%取得), God of Grid

---

## 10. ユーザー認証（実装済み）

- Supabase Auth（Google・メール+パスワード）
- MyPageからログイン可能
- player_profilesテーブル作成済み
- ドメイン変更後もデータ引き継ぎ可能

---

## 11. テストプレイ仕様

### テストモードURL
`https://neverend.vercel.app?mode=test`

### テストモードの制限
- 販売ページリンク非表示
- Stage 20以降プレイ不可
- TEST MODEバッジ表示

### テスト戦略
- **テストプレイ中は販売・背景購入システムは非公開**
- 宝探し形式：動画説明文にURLを隠す
- テストプレイヤーはクレジット掲載（Googleフォームで申請）

---

## 追記：グリッド・価格体系 最終確定（2026-04-25）

### グリッド仕様（最終確定）

| 項目 | 内容 |
|---|---|
| グリッド | 128×72（9,216マス）全ステージ統一 |
| 細分化面 | 廃止 |
| ブロックサイズ | 10×10px相当 |
| ゲームエンジン | 変更なし（16×16pxのまま） |

### 価格体系（最終確定）

| 段階 | 面価格 | 1マス単価 | 値上げ条件 |
|---|---|---|---|
| ローンチ | $3,000/月 | $0.325 | 開始時 |
| 第2段階 | $5,000/月 | $0.543 | 累計売上$1,000（直近1年以内） |
| 第3段階 | $7,500/月 | $0.814 | 累計売上$5,000（直近1年以内） |
| 第4段階 | $10,000/月 | $1.085 | 累計売上$20,000（直近1年以内） |
| プレミア1 | $12,500/月 | $1.357 | 累計売上$100,000（直近1年以内） |
| プレミア2（上限） | $15,000/月 | $1.628 | 累計売上$300,000（直近1年以内） |

**基本は$10,000が実質上限。$12,500・$15,000はゲームが大ヒットした場合のプレミア価格。**

値上げ条件：累計売上がトリガー金額に達した場合でも、直近1年以内に達成していなければ値上げしない。

### 購入・割引（変更なし）
- 最低購入：4マス
- 最低決済：$5
- 200-499マス：-10%
- 500-999マス：-20%
- 1,000+マス：-30%

### 早期購入者特典（変更）
- 20人限定特典は廃止
- 全購入者が購入時の価格で永久固定
- 解約で特典消滅、譲渡不可

### 値上げトリガーの公開
- 販売ページにトリガー条件を明示する
- 「今買うと永久にこの価格」という安心感と購買意欲を両立
