#!/bin/sh
# 生成颗粒与纸纹贴图（需要 ffmpeg）。
set -e
cd "$(dirname "$0")/.."
mkdir -p public/textures
ffmpeg -y -loglevel error -f lavfi -i "nullsrc=s=256x256,format=gray,geq=lum='128+(random(1)-0.5)*200'" -frames:v 1 public/textures/grain.png
ffmpeg -y -loglevel error -f lavfi -i "nullsrc=s=512x512,format=gray,geq=lum='random(1)*255',gblur=sigma=1.3,eq=contrast=1.8" -frames:v 1 public/textures/paper.png
