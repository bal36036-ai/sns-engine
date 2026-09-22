// Threads長期アクセストークンの生存確認スクリプト。
// GitHub Actionsの定期実行から呼ばれ、トークンが無効(期限切れ等)ならexit 1で終了する。
// 呼び出し元のワークフロー側でこの失敗を検知してIssueへ警告コメントを出す想定。
// トークンの中身は一切出力しない。

const { getMe } = require("./threads-client");

getMe()
  .then((me) => {
    console.log(`OK: THREADS_ACCESS_TOKENは有効です(username=${me.username})`);
  })
  .catch((e) => {
    console.error(`NG: THREADS_ACCESS_TOKENが無効の可能性があります: ${e.message}`);
    process.exit(1);
  });
