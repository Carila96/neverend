# Project Status

最終更新: 2026-09-15
現在のbranch: `main`

## 現在地

- NeverEndは旧CARILA WORKS Harness導入前のRepository。
- ゲーム自体は既にProduction公開済み。直近Mergeの反映有無と、作品そのものの公開状態を混同しない。
- Stripe本番Checkoutは実際に生成されている。
- 2026-09-15時点で確認したStripe本番アカウントでは、Checkout Sessionは存在するが全件 `payment_status=unpaid` / `expired`、PaymentIntentは0件。
- したがって現時点の最大課題は「決済機能が存在しない」ことではなく、Checkout生成後に支払い完了へ至っていないこと。
- 最初の1円候補として、購入導線・価格表示・Checkout到達後離脱の改善を優先する。

## 完了済み

- Stripe Checkout / subscription作成APIあり。
- Stripe webhookでCheckout完了後に契約作成・blocks claim・placement反映を行う実装あり。
- Supabase認証必須の購入フローあり。
- 本番StripeでCheckout Session生成実績あり。
- 価格はclaimed blocksに応じたtier方式。
- 2026-09-15監査で販売ページの古い価格表示を修正。
- 「1マスから / 最低決済$1」の確定仕様に合わせ、1〜2マスも$1で購入可能になるようreserve計算を修正。
- 実装されていない「First month prorated」表記を削除。
- Privacy Policyリンクを正しいページへ修正。

## 現在の作業

- 収益化経路監査と、最初の1円に向けた購入導線の整合性修正。

## 直近の重要変更

- 販売ページに残っていた旧価格:
  - Launch $3,000/stage/mo
  - sales-based escalation
  を削除し、現行仕様:
  - $1,000/stage/mo
  - $0.40/block/mo
  - 年払い10か月分
  - price lock
  と一致させた。
- API側の最低購入条件を「3マス以上実質必要」から、仕様どおり「1マスから、最低決済$1」へ修正。

## PR / Merge状況

- PR #1: 収益化導線の価格表示と最低購入条件修正 — Merge済み。
- PR #2: Growthファネル計測追加 — Merge済み。
- PR #5: 標準Business Metrics endpoint追加 / 公開売上額分離 — Merge済み。

## 検証状況

- Repositoryコード監査済み。
- Stripe本番データ確認済み。
- Checkout Session生成: 成功実績あり。
- PaymentIntent: 0件。
- 実購入完了: 未確認。
- Production反映はMerge後、CARILA WORKS Control経由でユーザーが行う。

## ブロッカー / 未確定事項

- Checkout到達者が支払いを完了しなかった理由は、Stripeデータだけでは断定できない。
- ファネル計測コードはMerge済み。Production公開後に実データ蓄積・転換率確認が必要。
- Stripe売上をCARILA WORKS Controlへ安全に自動集約するには、ControlからStripeへ直接アクセスする認証設計、またはNeverEnd側から安全に集計値を渡す仕組みが必要。

## 次にやる具体的な作業

1. CARILA WORKS Controlから公開版更新。
2. Productionで販売ページ表示・1マス購入フロー・growth-summary APIを確認。
3. 実データで app_view → sales_view → sales_cta → checkout_created → purchase_completed の最大離脱点を特定。
4. CARILA WORKS Controlの「事業」で標準Metrics自動取得が反映されることを確認する。
5. 実測ファネルを基に最大離脱点を1つ改善する。

## 再開時の注意点 / Handoff

- 価格表示と請求額は必ず同一仕様を参照する。
- `api/grid.js` と `api/reserve.js` のPRICE_TIERSは同期が必要。
- Production公開はCARILA WORKS Controlからユーザーが行う。
- Checkout Session生成を「売上発生」と誤認しない。支払い完了・PaymentIntent・subscription成立まで確認する。


## 2026-09-15 — Growth funnel計測基盤

- 既存Supabaseへ `growth_events` テーブルを追加。
- RLSを有効化し、anon/authenticatedからの直接アクセスをrevoke。service_role経由のサーバーAPIのみ書き込み可能。
- 匿名イベント:
  - `app_view`
  - `sales_view`
  - `sales_cta`
  - `checkout_created`
  - `purchase_completed`
- ユーザーID、メール等はgrowth eventに保存しない。
- `GET /api/stats?type=growth-summary` で過去30日の件数・転換率を集計できる。売上額は公開レスポンスへ出さない。
- Stripe webhookの `checkout.session.completed` 成功後に purchase_completed と実決済額を記録する。
- Privacy Policy / cookie noticeを匿名利用分析に合わせて更新。
- DB migrationのinsert/delete検証済み。テスト行は0件に戻した。
- Supabase Security Advisor確認: growth_eventsは「RLS enabled / policyなし」のINFO。anon/authenticated権限をrevokeしservice_role専用としているため意図した構成。既存DBには本件以前からの別Security Advisor警告あり（今回の変更範囲外）。
- PR #2はVercel Preview Ready / GitHub status successを確認後Merge済み。
- 次: CARILA WORKS Controlから公開版更新し、Productionでファネル計測開始。


## 2026-09-15 — 標準Business Metrics endpoint

- 公開Growth集計から売上額を分離。
- `GET /api/carila-business-metrics` を追加し、CARILA WORKS Controlの共通自動取得規格に対応。
- 公開するのは30日間の匿名集計件数と転換率のみ（App / Offer / CTA / Checkout / Purchase）。
- raw event、ユーザー情報、売上額は公開しない。
- 次: CARILA WORKS Controlから公開版更新後、Production endpointとControl自動表示を確認。


## 2026-09-15 — Audience-first Growth方針

- The Million Dollar Homepageの成功要因を「ピクセル販売」ではなく、初期Social Proof → 物語化 → メディア露出 → 注目増加 → 広告価値増加の順序として整理。
- neverENDは当面ゲームファーストで訴求し、背景広告/スポンサー販売を主要OGP・主要動画の第一メッセージにはしない。
- 先にゲーム流入・共有・競争性を伸ばし、注目と最初の掲載例ができた段階でスポンサー訴求を強める。
- `docs/GROWTH_STRATEGY.md` を追加。
- DEPENDENCY DELTA: NONE

## Harness / GitHub capability verification
- GitHub操作可否を一経路の失敗だけで判断しない必須ルールを `AGENTS.md` へ追加済み。
- `GitHub操作不可` / `Merge不可` と報告する前に、認証済みGitHub connector/APIでRepository metadata、latest commit、Open PR、file readを直接確認する。
- 書き込み依頼ではsafe writeも実際に試してから可否を判断する。


## 2026-09-19 — CARILA共通Analytics / SEO補完

- 既存GA4とNeverEnd専用growth funnelは維持したまま、CARILA WORKS横断比較用の共通匿名Analytics clientを追加。
- project idは `neverend`。
- 共通計測でpage view / UTM・referrer / session・再訪 / PWA standalone / 対応browserのinstall / outbound linkを横断比較可能にする。
- 既存 `robots.txt` / `sitemap.xml` / canonical / OGP はすでに存在するため維持。
- 検索エンジン向けに `VideoGame` JSON-LDを追加。
- Control Production側の共通Analytics APIはGitHub Actions runner開始前failureが解消するまで未稼働。clientは失敗を無視するためゲーム本体へ影響しない。
- DEPENDENCY DELTA: NONE
