# CARILA WORKS Repository Rules

このRepositoryは既存CARILA WORKS作品です。既存仕様・既存運用を壊さず、実際のコード・Git状態を会話より優先してください。

## GitHub 操作可否の判定

CARILA WORKSの実装・修正タスクでGitHub操作が必要な場合は、container / shell / git clone / DNS / browser / web / raw URL など一つの経路が失敗しただけで、GitHub全体を利用不能と判断しない。

`GitHub操作不可` / `Merge不可` と報告する前に、認証済みGitHub connector / GitHub API経路で最低限以下を直接確認する。

1. Repository metadataを取得できるか。
2. default branchの最新commitを取得できるか。
3. Open PRを取得できるか。
4. 対象ファイルを1つ以上読めるか。
5. 書き込みを伴う依頼では、通常の作業branch作成など安全なwrite操作を実際に試し、権限拒否かどうかを確認する。

- 上記GitHub直接経路が成功している限り、containerや別経路の失敗を理由に作業を止めない。
- 書き込み依頼ではread成功だけでなくwrite経路まで確認してから可否を判断する。
- 本当にblockedの場合だけ、失敗した操作・経路・権限エラーを `work/PROJECT_STATUS.md` 等へ残す。
- GitHub操作が可能なら、原因特定→修正→検証→文書更新→PR→Mergeまで一続きで進める。

## Production

- Production公開はCARILA WORKS Controlからユーザーが行う。Repository側から勝手にProduction公開しない。
