#!/bin/bash
set -e
FFMPEG="/c/Users/sdk_y/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg"
SRC="C:/新しいフォルダー/OneDrive/AI作成/SNS集客/素材_v1/投稿6_一番面倒なのはどれ.png"
DIR="C:/新しいフォルダー/OneDrive/AI作成/SNS集客/素材_v1/day10_capture"
OUT="C:/新しいフォルダー/OneDrive/AI作成/SNS集客/素材_v1/投稿6_参加型テスター募集_v1.mp4"
FONT="C\\:/Windows/Fonts/YuGothB.ttc"
mkdir -p "$DIR"

# 1080x1350の元画像を1080x1920キャンバスへ(背景色で上下パディング)し、ゆっくりズーム。
# 画像内に既に全情報(質問文・選択肢・テスター募集)が入っているため、追加テロップは末尾のみ最小限。
"$FFMPEG" -y -loop 1 -i "$SRC" -t 7.0 -vf "scale=1080:1350,pad=1080:1920:0:(1920-1350)/2:color=0xF5F1EA,zoompan=z='min(zoom+0.0006,1.04)':d=210:s=1080x1920:fps=30" -c:v libx264 -pix_fmt yuv420p -r 30 "$DIR/base.mp4" 2>&1 | tail -2

"$FFMPEG" -y -i "$DIR/base.mp4" -vf "drawtext=fontfile='$FONT':text='テスター募集中｜げんばアプリ工房':fontcolor=white:fontsize=42:borderw=5:bordercolor=black:x=(w-text_w)/2:y=h-90:enable='gte(t,5.2)':alpha='if(lt(t,5.2),0,if(lt(t,5.6),(t-5.2)/0.4,1))'" -c:v libx264 -pix_fmt yuv420p -r 30 "$OUT" 2>&1 | tail -2

echo "OUTPUT: $OUT"
"$FFMPEG" -i "$OUT" 2>&1 | grep Duration
