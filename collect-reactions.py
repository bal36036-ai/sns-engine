"""毎日の反応の記録。Buffer（TikTok・YouTube Shorts・X・Instagram）とMetricool（Threads）の数字を、1つの表に積み上げる。
読み取りと記録だけ（投稿・承認・DB変更はしない）。

使い方：
  python collect-reactions.py --buffer <Buffer list_posts の結果のJSONファイル> --threads <Metricool の結果のJSONファイル> [--date YYYY-MM-DD]
出力：SNS集客/反応記録/反応データ.csv（取得日ごとに追記。同じ取得日は上書き）と、SNS集客/反応記録/YYYY-MM-DD.md（その日のまとめ）

Threadsの列は、Metricoolの項目 THPO02（投稿日時・UTC）・THPO03（本文）・THPO06（URL）・THPO08（表示回数と思われる数）・THPO09（その隣の数）の順。
THPO08/09の項目名は未確認のため、「表示回数と思われる数」として扱う。
"""
import argparse
import csv
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "反応記録"
CSV_PATH = OUT / "反応データ.csv"
JST = timezone(timedelta(hours=9))
SNS_NAME = {"tiktok": "TikTok", "youtube": "YouTube Shorts", "twitter": "X", "instagram": "Instagram", "threads": "Threads"}
HEAD = ["取得日", "媒体", "投稿日時(JST)", "アプリ", "本文の先頭", "表示回数", "いいね", "コメント", "共有・リポスト", "質問(？)あり", "フォロー誘導の一文", "画像・動画", "ID・URL"]


def load_json(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(data, list) and data and isinstance(data[0], dict) and "text" in data[0] and "type" in data[0]:
        data = json.loads(data[0]["text"])
    return data


def app_of(text):
    k, h = "キリドリ" in text, "ハリナビ" in text
    if k and h:
        return "両方"
    return "キリドリ" if k else "ハリナビ" if h else "不明"


def flags(text):
    q = "あり" if "？" in text else "なし"
    cta = "あり" if ("フォローしてお待ちください" in text or "フォローして見守って" in text) else "なし"
    return q, cta


def num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def buffer_rows(path, day):
    rows = []
    for e in load_json(path).get("edges", []):
        p = e.get("node", e)
        if p.get("status") != "sent" or not p.get("sentAt"):
            continue
        m = {x["type"]: x["value"] for x in (p.get("metrics") or [])}
        views = m.get("views", m.get("impressions"))
        text = (p.get("text") or "").replace("\n", " ")
        q, cta = flags(text)
        sent = datetime.fromisoformat(p["sentAt"].replace("Z", "+00:00")).astimezone(JST)
        rows.append([day, SNS_NAME.get(p["channelService"], p["channelService"]), sent.strftime("%Y-%m-%d %H:%M"), app_of(text), text[:40],
                     views, m.get("reactions"), m.get("comments"), m.get("shares", m.get("reposts")), q, cta,
                     "あり" if p.get("assets") else "なし", p["id"]])
    return rows


def threads_rows(path, day):
    rows = []
    for r in load_json(path).get("rows", []):
        dt = datetime.strptime(r[0], "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc).astimezone(JST)
        text = (r[1] or "").replace("\n", " ")
        q, cta = flags(text)
        rows.append([day, "Threads", dt.strftime("%Y-%m-%d %H:%M"), app_of(text), text[:40],
                     num(r[3]) if len(r) > 3 else None, num(r[4]) if len(r) > 4 else None, None, None, q, cta, "なし", r[2]])
    return rows


def read_csv():
    if not CSV_PATH.exists():
        return []
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.reader(f))[1:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--buffer")
    ap.add_argument("--threads")
    ap.add_argument("--date")
    a = ap.parse_args()
    day = a.date or datetime.now(JST).strftime("%Y-%m-%d")
    OUT.mkdir(parents=True, exist_ok=True)
    new = []
    if a.buffer:
        new += buffer_rows(a.buffer, day)
    if a.threads:
        new += threads_rows(a.threads, day)
    old = read_csv()
    prev_day = max((r[0] for r in old if r[0] < day), default=None)
    prev = {r[12]: num(r[5]) for r in old if r[0] == prev_day}
    kept = [r for r in old if r[0] != day]
    all_rows = kept + [["" if v is None else v for v in r] for r in new]
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEAD)
        w.writerows(all_rows)

    d0 = datetime.strptime(day, "%Y-%m-%d")
    cutoff = (d0 - timedelta(days=14)).strftime("%Y-%m-%d")
    recent = [r for r in new if r[2][:10] >= cutoff]
    lines = [f"# 反応のまとめ（{day}）", "",
             f"- 取得元：Buffer（TikTok・YouTube Shorts・X・Instagram）、Metricool（Threads）。前回の記録：{prev_day or 'なし（初回）'}",
             "- 注意：YouTube・TikTokの数字は更新が最大1日遅れる。Threadsの数字は項目名が未確認（表示回数と思われる数）。数字が小さいので、1日の差は偶然の範囲のことが多い。", ""]
    lines += ["## 媒体別（直近14日の投稿）", "", "| 媒体 | 投稿数 | 表示回数の合計 | 1投稿あたり | いいね合計 | 前回からの増加 |", "|---|---:|---:|---:|---:|---:|"]
    for sns in ["Threads", "X", "TikTok", "YouTube Shorts", "Instagram"]:
        rs = [r for r in recent if r[1] == sns]
        if not rs:
            continue
        v = sum(num(r[5]) or 0 for r in rs)
        lk = sum(num(r[6]) or 0 for r in rs)
        known = [r for r in rs if r[12] in prev and prev[r[12]] is not None]
        inc = (sum(num(r[5]) or 0 for r in known) - sum(prev[r[12]] for r in known)) if known else None
        lines.append(f"| {sns} | {len(rs)} | {v:,} | {v / len(rs):.0f} | {lk} | {('+%d' % inc) if inc is not None else '-'} |")
    withv = [r for r in recent if num(r[5]) is not None]
    top = sorted(withv, key=lambda r: -num(r[5]))[:5]
    old_cut = (d0 - timedelta(days=2)).strftime("%Y-%m-%d")
    low = sorted([r for r in withv if r[2][:10] <= old_cut], key=lambda r: num(r[5]))[:3]
    lines += ["", "## 見られている投稿 上位5件", ""] + [f"- {r[1]}｜{r[2]}｜{r[3]}｜**{num(r[5]):,}回**｜{r[4]}" for r in top]
    lines += ["", "## 見られていない投稿（投稿から2日以上たったもの、下位3件）", ""] + [f"- {r[1]}｜{r[2]}｜{r[3]}｜{num(r[5]):,}回｜{r[4]}" for r in low]
    gains = sorted([(num(r[5]) - prev[r[12]], r) for r in withv if r[12] in prev and prev[r[12]] is not None], key=lambda x: -x[0])[:3]
    gains = [(d, r) for d, r in gains if d > 0]
    if gains:
        lines += ["", "## 前回から増えた投稿 上位3件", ""] + [f"- {r[1]}｜{r[4]}｜+{d}回" for d, r in gains]
    tx = [r for r in withv if r[1] in ("Threads", "X")]
    q = [r for r in tx if r[9] == "あり"]
    nq = [r for r in tx if r[9] == "なし"]
    th = [r for r in withv if r[1] == "Threads"]
    cta = [r for r in th if r[10] == "あり"]
    ncta = [r for r in th if r[10] == "なし"]

    def avg(rs):
        return "-" if not rs else f"{sum(num(r[5]) for r in rs) / len(rs):.0f}"

    lines += ["", "## 型ごとの平均（直近14日）", "",
              f"- Threads・Xで質問（？）あり：{len(q)}件、平均 {avg(q)}回／なし：{len(nq)}件、平均 {avg(nq)}回",
              f"- Threadsでフォロー誘導の一文あり：{len(cta)}件、平均 {avg(cta)}回／なし：{len(ncta)}件、平均 {avg(ncta)}回"]
    md = "\n".join(lines) + "\n"
    (OUT / f"{day}.md").write_text(md, encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(md)
    print(f"記録：{CSV_PATH}（{len(all_rows)}行）")


main()
