# neverEND / damnrun Production Acceptance
検査日: 2026-10-10 (UTC)  
対象: https://damnrun.com/  
判定: **重要な問題あり。販売・購入後機能のAcceptanceは未合格。ゲームの基本操作は確認できたが、総合Acceptance完了とはしない。**

## 1. 正本・検査範囲
会話履歴を正本にせず、GitHub connectorでCARILA WORKS関連Repository、metadata、main、Open PR、管理文書、実装を取り直した。実装Repositoryは[Carila96/neverend](https://github.com/Carila96/neverend)。公開・main・push権限を確認し、安全な作業branchの作成とcommit/PR作成も成功。

- main: c074e8284ad801775674791cbec8b4db073860b6（2026-10-04、favicon修正PR #11 merge）
- 当初のOpen PR: [#12 AdSense公開前のPrivacy・法務導線](https://github.com/Carila96/neverend/pull/12)。今回の修正は独立したPR #13。
- 確認した管理文書: AGENTS.md、work/PROJECT_STATUS.md、docs/specification/neverend_core_spec.md、neverend_master_spec_v7.md、関連仕様と移行文書。
- 存在しなかったもの: CARILA_WORKS_PLAYBOOK.md、PROJECT_BRIEF.md、work/CURRENT_TASK.md、docs/UNRESOLVED.md、carila-project.json。各不在を確認し、探索は打ち切った。
- 古い仕様は現在の実装と差がある。stage数・grid・価格を過去文書だけでバグ認定しない。
- Productionの画面・DOMとmainを比較したが、Productionの配信commit SHAは確定できていない。「main＝Production」とは断定しない。

証拠区分: **実画面**＝Cloud Browserで操作・観察、**コード**＝main実装確認、**回帰**＝修正branchのローカルテスト、**未検証**＝合格扱いしない。Chromeの実Viewportは1363×936。新規ログイン成功・購入済み状態・実決済は未到達。

## 2. 総合評価
| 領域 | 評価 | 根拠・限界 |
|---|---|---|
| 初回訪問 | 雰囲気は明確、説明・発見性は改善推奨 | 塔・neverEND・30 seconds・SPACE STARTで開始は分かる。移動/ジャンプ/ポーズの下部説明はかなり薄い。背景枠参加の存在をゲーム入口から発見しにくい |
| ゲーム | 基本ループ成立、品質保証は未完了 | Normal複数プレイ、移動、ジャンプ、死亡、リトライ、ポーズ、タイトル復帰を確認。Hard開始・死亡・リトライも確認 |
| 販売 | 修正必須の失敗処理とUX断絶あり | 説明前のログイン割込み、HOW IT WORKS不動、価格プレビュー不整合、保存失敗時の決済開始を確認/コード特定 |
| マイページ | 購入後Acceptance未実施 | 未ログインの画面と規約モーダルまで。実契約の履歴・保存・公開反映は未検証。配置変更APIには重要な整合性問題 |
| スマホ | 未検証 | このCloud BrowserにはViewport変更・device emulation能力がなく、ブラウザショートカットでも切替画面が出なかった。コードのレスポンシブ対応だけで合格にしない |
| PC | 現在幅で致命的崩れなし | ゲームの横長領域と上下余白、販売の縦長操作を観察。別のノート幅/大型デスクトップ幅は未検証 |
| 通しのjourney | ログインまで実操作、購入以降未合格 | ゲーム→My Page→Claim Your Spaceは辿れる。認証と販売説明の順序、決済結果→設定に断絶がある |

「また遊ぶか」: 最初の罠を知って再挑戦する短いループは成立する。失敗画面のSPACEリトライは良い。一方、序盤の隠し罠と薄い操作説明は、学習の手応えより理不尽さが先に来るユーザーを生みうる。後半・クリア未到達のため全体の面白さは評価し切れていない。

「背景枠を買うか」: 色調とゲーム内の一部になる表現には魅力がある。ただし、初見の企業・個人にとって、実際の掲載例・どこで何回見られるか・購読中の権利・購入後の作業が一度に理解しづらい。現在の説明だけで安心して継続課金するには不足がある。

## 3. ゲーム実操作の結果
- Normal: 30秒付近からの開始、左右移動、SPACEジャンプ、床と足場、目に見える棘と近づくと発生する罠、死亡画面、FLOOR/SCORE表示を確認。少なくとも2回のNormal死亡とその後の再開を観察。
- ポーズ: F、PAUSED、ESC/F Resume、T Back to Titleを確認。タイマーが止まった表示を観察。
- Hard: 実装の隠しコマンド h×5を入力し、24.7秒・HARD表示、死亡、SPACEリトライで再び24.7秒を確認。初期値はコード上25秒。罠の反応がNormalより短い仕様。
- タイトルの「???」はHardの選択ではなく、別の解放要素。Hardが隠しコマンドであること自体は仕様。一般ユーザー向け難易度選択として見つけにくいことはUX評価。
- +5sの砂時計、GOAL、足場は表示された。砂時計の取得、実際の加算、GOAL到達、階移動、タイムアップ前後、最終クリアは未検証。
- 入力連続保持を試したが、Cloud Browserのフレーム進行は実時間より著しく遅い。コードのdt上限0.05秒も確認。通常端末の入力遅延・取りこぼし・fps・30秒の体感をこの環境だけから不具合認定しない。
- 死亡の「Trapped. Obviously.」等のコピーは雰囲気に合うが、何に触れたか学ぶ助けは弱い。これはゲームデザイン改善候補。罠や制限時間を勝手に変えていない。
- X Shareボタンと実装を確認。SNSへの投稿は実施していない。

## 4. 販売・価格・決済
実画面にはClaim Your Space、Grid 128×72 / 9216 blocks、サイズプリセット、Upload→Size→Edit Colors→Stage→Place→Pay、月額/年額、Full Stage $1000などが存在する。自由な大きさと場所を選べる価値はあるが、最初から6工程の編集UIが目立ち、商品理解が後回しになる。

### 価格の検証
現行backend（reserve.js）は全stage 9216ブロックの場合にtierのfull-stage定額、その他は最低$1・割引後の整数ドル切捨て。年額は月額×10。
現行UIは小数表示と別の割引境界が混在していた。

| ケース | 変更前UIの問題 | 現行backend/修正後 |
|---|---|---|
| 1 block / launch tier | $0.40を最小購入額に見せる | $1最低 |
| 49 blocks | 小数$19.60と整数$19の混在 | $19 |
| 500 blocks | UIでは20%境界 | 10% |
| 1000 blocks | UIでは30%境界 | 20% |
| 9216 blocks | full定額にも30% OFF表示が付きうる | full定額、割引率表示なし |

Stripe Carila本番を読み取りで確認。取得6件のCheckout sessionは全件expired/unpaid、has_more=false。直近5件のline itemsでは506 blocks=$161/月、2304=$645/月、9216=$1000/月で現行backend計算と一致。古い1件は旧額であり、過去sessionを現在価格の不具合と扱わない。顧客・session key等は本レポートに記載しない。

価格はcreate-checkout.jsのdynamic price_data。固定Stripe Price IDとの比較対象はない。今回の修正は既存請求ロジックにUIを合わせたもので、価格・tier・販売モデルの変更ではない。

決済E2E: Sandbox accountの存在と、本アプリが安全にTest Modeへ接続できる経路は別問題。現行API/redirectはdamnrun.comに固定されており、安全なアプリE2E経路は確認できない。新規本番Checkout生成・支払い・契約解約・実顧客編集は実施しなかった。Webhookによる実契約生成、決済キャンセル後の予約解除、戻る/再決済は未検証。

## 5. 認証・マイページ
販売ページはロード後のログインモーダル、および画像選択時にログイン要求。Cancelで閉じるだけでなくhistory.back/close/rootへ離脱しうるコード。HOW IT WORKSはhref="#"で実画面でも説明へ移動しない。

Googleボタン→Googleアカウント選択まで実遷移。ユーザーが安全な認証画面でアカウントを選択したが、待機中にOAuth state期限が切れ、Production rootへ error=invalid_request / bad_oauth_state / OAuth state has expired と戻った。これは認証成功ではない。期限切れそのものをOAuth設定不具合とは断定しない。**ゲーム画面に失敗案内がない点は実再現したUX不具合**。

My Pageは規約同意モーダルに到達。サブスク自動更新、即時解約、最大5分の反映、禁止コンテンツ等が提示される。I AGREEは法的同意に当たるため代理クリックしなかった。背後にTitles、Claim Your Space、Change Name、Loginが見える。

購入後の所有一覧/履歴/掲載状態、複数枠、編集保存/取消、画像差替、長文、URL、不正入力、セッション維持、logout→保護ページBack、更新後ゲーム掲載は**未検証**。コードは読み、URL保存・公開URL表示の防御と位置変更の危険を確認した。ログインや購入データを偽装して画面の成功を作っていない。

購入後「まず何をするか」は、契約activeとロゴ掲載完了を区別し、My Pageへ明示的に誘導する必要がある。既存success.htmlは契約状態からロゴ公開を推定し、未確定でもpayment receivedと案内する。修正branchでは確定前/未確定を明示し、My Page・Contactへ繋いだ。実掲載の証明にはならない旨を残す。

## 6. 不具合一覧
Severityは影響、Pは実施優先度。コード上の欠陥と本番で発生済みの事故を区別する。
修正済みは**PR内のみ・Production未反映**。

| ID / 分類 | Severity / P | 再現手順または検証条件 | 原因 | 状況 |
|---|---|---|---|---|
| B01 明確なバグ | Medium/P1 | 49/500/1000/9216 blocksでUI previewとreserve計算比較 | 小数額・割引境界・full定額の表示ロジック不一致 | 修正、64,512ケース回帰PASS |
| B02 UX不具合 | Medium/P1 | 販売を開く→ログインモーダル→Cancel/画像選択 | 800ms強制login、Cancelが履歴遷移、upload時も認証要求 | 自動popupとCancel離脱を修正。upload認証は既存仕様として保持 |
| B03 明確なバグ | Low/P2 | How It Works/Content Policyクリック | href="#"、対象見出しにidなし | 説明section・anchor修正 |
| B04 明確なバグ | High/P0 | /api/logo staging失敗を模擬→購入開始 | staging fetch失敗を.catch(()=>{})で握り潰し | 失敗時決済開始停止、回帰PASS |
| B05 明確なバグ | High/P0 | Stripe cancel例外を模擬→DB変更確認 | 例外をwarnだけにして契約/掲載を失効 | 502で停止、DB変更0、成功フロー維持PASS |
| B06 明確なバグ | High/P0 | 安全環境で位置変更後INSERT失敗、透過画像移動を試す条件 | 古いblocks DELETE→矩形INSERT、トランザクションなし。透明maskを全矩形へ置換 | 未修正。範囲外座標/空き取得失敗を事前拒否する保護だけ追加・回帰PASS |
| B07 明確なバグ/整合性リスク | High/P0 | 予約期限切れ→同座標別予約→旧session完了、同event同時処理/部分失敗再送を安全環境で検証 | Webhook claim/linkが予約所有者を限定せず矩形対象。contract INSERTとprocessed flagが非原子的 | 未修正。Production事故の実再現なし、DBの原子的処理と重複防止が必要 |
| B08 条件付き決済リスク | High/P1 | 遅延決済を許す場合session.completed unpaidを安全環境で投入 | payment_status gateなし、async_payment_succeeded未処理 | 未修正。現行本番で遅延決済が有効か未確認 |
| B09 明確なバグ/セキュリティ | High/P1 | javascript: / 引用符を含むpartner URLを公開renderへ渡す | URLをHTML属性へ未escape、scheme制限なし | 公開URLのhttp/https限定とescape、My Page入力検証修正。安全なローカルテストのみ |
| B10 UX不具合 | Medium/P1 | success.htmlで未確定/存在しないsessionを表示する条件 | paid/liveと確認状態の区別が弱く、設定先不明 | pending/error文言とMy Page導線修正。missing session公開画面確認 |
| B11 UX不具合 | Medium/P1 | Google選択待機→state期限切れ→rootに戻る | URLのOAuth errorを画面表示しない | 実再現、案内・再ログイン/販売へのリンク・Closeを追加 |
| B12 UX/運用問題 | Medium/P1 | image/size/place設定後にOAuthへ遷移 | uploadedImage/配置はメモリ。redirectTo full reloadでdraft復元経路なし | コード確認、完全再現未了。未修正 |
| B13 法務説明の整合性 | Medium/P1 | Privacy第三者サービス→Contactを比較 | PrivacyはFormspree、公開ContactはGoogle Forms | 確認、未修正。PR #12と併せて記載を現状に一致させる |

残存注意: Stripe解約後のDB更新エラーも現行コードで十分に扱われていない。B05でStripe失敗時の事故は防ぐが、Stripe成功→DB障害の整合性は保証していない。UIの二重クリックガードも、複数tab・API再送・Webhook再送までの請求冪等性を保証しない。

## 7. 仕様上は正常だが分かりにくい点
- 永続所有ではなく、購読が有効な間の背景掲載ライセンス。termsは明示するが「own/locked permanently」との印象差がある。修正でwhile activeと記載。
- 解約時即時枠解放は現行規約。月末までの掲載保証に勝手に変更していない。購入前に目立つ説明が必要。
- ロゴ反映は最大5分、即時ではない。成功画面の説明を調整。
- Hardは隠しコマンド、開始25秒。Normal基本30秒と異なるが仕様。
- 砂時計に+5sがあり、単純な全プレイ30秒固定ではない。
- 販売選択75stageとゲーム100floorは用途/販売範囲の違いの可能性がある。仕様確定前にバグとしない。
- Claimedの「—」、Availableの固定9216、全体claimed統計の表示は分母の意味が伝わりにくい。全体とstage別を混同して「矛盾」と断定しない。

## 8. UX / 販売CV / ゲームデザインの改善優先度
| 優先度 | 分類 | 候補 |
|---|---|---|
| P0 今すぐ | 不具合 | B04/B05を反映、B06/B07の原子的処理と予約所有者限定を安全環境で修正/再試験してから販売合格 |
| P1 | 購入後UX | 実購入済みfixtureで所有→編集→公開→解約の状態表示検査。pending/failed/active/publishedを区別 |
| P1 | 購入CV | 説明→掲載例→価格→編集→ログインの順序、OAuth後draft復元。強制認証は購入判断を妨げる |
| P1 | 初見UX | 操作説明のコントラスト/可読性、スマホのタップ操作と開始CTAの実機試験 |
| P1 | 運用/信頼 | Privacyの実サービス一致、PR #12の法務導線、Test Mode E2E・webhook再送検証 |
| P2 | ゲームデザイン候補 | 死亡原因の視覚的振返り、初回だけ操作ヒント。罠/難易度は事業者判断、今回未変更 |
| P2 | 販売CV | 全stageではなくstage別の掲載プレビュー、実績がある範囲の表示データ、購入者例と掲載リンク例 |
| P2 | UX | stage別空き枠数の正確な表示、サブスク状態と予約状態、キャンセル後の次の操作 |
| P2 | 性能 | favicon縮小、巨大index/debugコード整理、script/cache/画像測定後に最適化 |
| P3 将来 | 運用 | 端末別回帰、価格tier表示更新、購入/公開反映の監視と異常時の復旧導線 |

### 販売ページで必須の情報
対象（個人/企業）、どこに何が出るか、現在のstageとサイズ、継続課金/更新日/解約即時解放、編集できる項目、反映時間、購入後My Pageでの作業、禁止内容、返金/支払い失敗/問い合わせへのアクセス。掲載回数保証がない場合はその旨。PRの説明sectionは既存規約の範囲で補った。

### あると強い情報
実際の購入者背景のゲーム内例、ロゴの読みやすさ比較、stageに到達するユーザーとの関係、実測できた閲覧実績、支援・参加としての価値、掲載前後の短いプレビュー。未裏付けの「Thousands of players」はCVの安心材料にしない。

## 9. 法務・信頼性・SEO・性能
法的適法性の判定ではなくUI/運用上の確認。
- Terms実画面: 禁止コンテンツ、購読の自動更新、解約、返金、編集、5分反映がある。
- 特商法表記はTermsの日本語section15内に存在する。欠落とは報告しない。独立リンクと購入前アクセス性は改善余地。
- Contact実画面: Google Formsのメール/名前/件名/本文が表示される。メッセージ送信は未実施。二重スクロールと別サービスの見た目は摩擦。
- Privacyはページ/ソース存在。現状とサービス記載が一致していない点はB13。PR #12のAdSense等の整備は未Production反映。
- Production root DOM: title、description、favicon/apple icon、OGP title/description/url/image(1200×630)、Twitter large card、canonical確認。
- Repository robots.txt: Allow / と sitemap URL。sitemap.xml: game/sales/terms/privacy/contactの5URL。
- Production robots/sitemapはCloud BrowserでERR_BLOCKED_BY_CLIENT、Web検索取得も不可。siteの404/SEO障害とは認定せず、実配信未確認。
- SNSカードの実取得・実投稿、OG画像取得成功、検索index状況は未検証。
- root viewportにuser-scalable=no / maximum-scale=1。モバイル文字拡大制限はコード上確認できるが、実端末の可読性は未検証。
- 現行index.htmlは約556KB、favicon.pngは543,810 bytes。巨大コード・debug/複数touch処理・外部fonts/Supabase CDNが性能原因候補。ただし圧縮転送量、LCP/INP、API時間、auth/My Page待ち時間の定量測定は未実施。Cloud描画の遅さをそのままsite性能に帰属させない。

## 10. 修正内容・検証・公開状態
実装commit: [473e0abbf0af1e908c5cb9bad38a71777c1db743](https://github.com/Carila96/neverend/commit/473e0abbf0af1e908c5cb9bad38a71777c1db743)  
PR: [#13 Acceptance: 購入表示・失敗時の保護・購入後導線を修正](https://github.com/Carila96/neverend/pull/13)  
追加commitは同PRに含む。実装commitのVercel checkはsuccess。変更後のProduction再Acceptanceは未実施。main/Productionを変更していない。

対象:
- app/pages/sales_page.html — 説明section、login/cancel、最低価格/割引/丸め整合、logo失敗停止、二重クリック防御
- api/cancel-reservation.js — Stripe失敗時停止、位置範囲/空き状況取得失敗時停止
- app/pages/halloflegends.html — 公開partner name/URL escape、http/httpsのみ
- app/pages/mypage.html — URL保存時検証
- app/pages/terms.html — content-policy anchor
- app/pages/success.html — 未確定文言、My Page/Contact、noindex
- index.html — OAuth失敗案内（後続commit）
- tests/acceptance-regression.mjs — financial/error-path回帰
- work/PROJECT_STATUS.md、docs/ACCEPTANCE_20261010.md — 現在結果/残課題

検証コマンド: `node tests/acceptance-regression.mjs` PASS。
inline JS構文、7tier×9216サイズの月額/年額64,512ケース、unsafe URL/HTML、logo failure、duplicate click、Stripe cancel failure/success、範囲外/不完全座標、空き確認failure、OAuth expiry表示/URL cleanupを検証。Stripe/Supabaseはmockであり本番統合テストではない。

AGENTS.mdの明文: 「Production公開はCARILA WORKS Controlからユーザーが行う。Repository側から勝手にProduction公開しない。」
PRはmerge可能だがmain merge時のProduction自動公開安全性が未確定のため未merge。権限不足やGitHub利用不能ではない。

## 11. Acceptance残項目
| 項目 | 今回の状態 | 継続時の検査 |
|---|---|---|
| 30秒境界/砂時計/clear | 未検証 | 低fps環境以外でNormal/Hard、time-up前後、clear、連続リトライ |
| モバイル縦横/タッチ/Safe Area | 未検証 | 実端末またはViewport対応環境でgame/sales/My Page、キーボード/モーダル/固定UI |
| PC複数幅 | 1363×936のみ | ノートPC幅・大画面で余白、game scale、販売編集 |
| Google初回/維持/logout/戻る | Google選択→expiredまで | 本人同意・再ログイン後、session維持/再要求/保護ページ戻る |
| 購入済My Page | 規約modalまで | 所有/履歴/複数枠、空状態、長文、URL、画像、保存/取消/公開反映 |
| 決済Test E2E | 安全なapp経路未確認 | Productionと分離された同一実装でsuccess/cancel/二重操作/戻る/webhook再送 |
| API整合性 | コードとmockのみ | B06/B07/B08とStripe成功DB失敗、競合/期限切れ |
| SEO配信/性能 | DOMとrepo、一部制限 | robots/sitemap/OGの実取得、network timing/LCP/INP、低速回線 |

この長い横断操作はWork向きであり、本セッションではWork内で実施した。継続依頼文:
```text
neverEND PR #13とdocs/ACCEPTANCE_20261010.mdを現在のGitHub/Productionから取り直し、本人同意・ログイン後のMy Page Acceptanceを続けてください。安全なTest Mode環境でB06/B07/B08の整合性と購入E2Eを検証し、mobile縦横/タッチ/30秒境界の未検証項目を埋めてください。実決済とProduction公開は行わないでください。
```

## 12. 人間の操作が必要な残作業（これだけ）
1. 提示したCloud BrowserのMy Pageで規約/Privacyを読み、同意する場合だけI AGREEを本人が操作する。規約の代理同意は行わない。Google再認証が必要になれば安全な認証画面で本人が進める（パスワードをチャットへ送らない）。
2. 実購入済み状態を検査するためのテスト契約があるアカウント/安全なTest Mode環境を指定する。新たな本番支払いは不要。
3. PR #13および既存PR #12の反映は、販売整合性の残課題を解消・再検証したうえでCARILA WORKS Controlから行う。価格・ゲームルール・販売モデルの改善提案を採用するかは事業判断。

実装・検証・レポート作成をユーザーの作業へ丸投げしない。上記の本人同意/認証と環境指定、公開判断以外は継続作業として実施できる。
