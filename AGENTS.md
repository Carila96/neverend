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

## ChatGPT Work の提案・分業

- CARILA WORKSの全作品で、依頼の一部または全部が通常ChatよりChatGPT Workに明確に適するかを毎回判断する。対象例は、大量のWeb横断調査、複数サイト比較、長時間のCloud Browser作業、フォーム入力、外部サービスをまたぐ多段階実務、調査から成果物作成までの長い作業である。
- Workが有効な場合は、ユーザーが気付いていなくても**「この部分はWork向き」**と明示し、何が楽になるかを短く説明する。
- その際、ユーザーがWorkへそのまま貼れる**具体的な依頼文をコードブロックで提示する**。抽象的に「Workを使ってください」で止めない。
- 通常ChatからWorkへ自動切替できるような表現はしない。現在の環境で実行可能な作業はそのまま進め、Workが有利な部分だけを切り分ける。
- Repository調査・実装・テスト・PR・Mergeは引き続きGitHub connectorを第一選択とし、WorkをGitHub作業の代替にしない。

