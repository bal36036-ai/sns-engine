#!/bin/bash
set -e
FFMPEG="/c/Users/sdk_y/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg"
DIR="C:/新しいフォルダー/OneDrive/AI作成/SNS集客/素材_v1/day9_capture"
OUT="C:/新しいフォルダー/OneDrive/AI作成/SNS集客/素材_v1/投稿5_PDF_Excel出力_v1.mp4"
FONT="C\\:/Windows/Fonts/YuGothB.ttc"

declare -a IMAGES=("01_before.png" "01b_pdf_highlight.png" "02_pdf_done.png" "02b_excel_highlight.png" "03_excel_done.png" "03_excel_done.png")
declare -a DURS=(1.4 1.1 1.8 1.1 1.8 1.3)
declare -a TEXTS=("材料取りアプリ「キリドリ」" "PDFを作成をタップ" "その場でPDFが出力" "Excelも同じ画面から" "Excelも同時に作れる" "開発中｜げんばアプリ工房")

rm -f "$DIR"/clip_*.mp4 "$DIR"/concat_list.txt

for i in "${!IMAGES[@]}"; do
  img="$DIR/${IMAGES[$i]}"
  dur="${DURS[$i]}"
  text="${TEXTS[$i]}"
  frames=$(awk "BEGIN{printf \"%d\", $dur*30}")
  clip="$DIR/clip_$i.mp4"
  "$FFMPEG" -y -loop 1 -i "$img" -t "$dur" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0008,1.06)':d=$frames:s=1080x1920:fps=30,drawtext=fontfile='$FONT':text='$text':fontcolor=white:fontsize=54:borderw=6:bordercolor=black:x=(w-text_w)/2:y=h-260:box=1:boxcolor=black@0.45:boxborderw=20" -c:v libx264 -pix_fmt yuv420p -r 30 "$clip" 2>&1 | tail -2
  echo "file '$clip'" >> "$DIR/concat_list.txt"
done

"$FFMPEG" -y -f concat -safe 0 -i "$DIR/concat_list.txt" -c copy "$OUT" 2>&1 | tail -5

echo "OUTPUT: $OUT"
"$FFMPEG" -i "$OUT" 2>&1 | grep Duration
