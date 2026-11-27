#!/usr/bin/env bash
# Prepara dist/ para publicarlo como Artifact de claude.ai (privado):
# los artifacts no sirven .glb/.ktx2, así que se publican en base64 (.txt) y un
# pequeño shim de fetch en la página los decodifica. Uso: npm run build && tools/stage-artifact.sh <dir>
set -euo pipefail
OUT=${1:?directorio de salida}
rm -rf "$OUT" && mkdir -p "$OUT" && cp -r dist/. "$OUT"/ && rm -f "$OUT/index.html"
find "$OUT" -name "*.md" -delete
find "$OUT" \( -name "*.glb" -o -name "*.ktx2" \) | while read -r f; do base64 -w0 "$f" > "$f.txt"; rm "$f"; done
JS=$(grep -o 'assets/index-[^"]*\.js' dist/index.html); CSS=$(grep -o 'assets/index-[^"]*\.css' dist/index.html)
cat > "$OUT/campus-uap.html" <<HTML
<title>Campus UAP 3D</title>
<meta name="theme-color" content="#0b0f14">
<style>:root{color-scheme:dark}html,body{height:100%;background:#0b0f14;color:#f2f4f7}</style>
<script>
(() => {
  const nativeFetch = window.fetch.bind(window);
  const BIN = /\.(glb|ktx2)(\?.*)?$/;
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!BIN.test(url)) return nativeFetch(input, init);
    const res = await nativeFetch(url.replace(BIN, '.\$1.txt'), init);
    if (!res.ok) return res;
    const bin = Uint8Array.from(atob(await res.text()), (c) => c.charCodeAt(0));
    return new Response(bin, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
  };
})();
</script>
<link rel="stylesheet" href="./$CSS">
<div id="app"></div>
<script type="module" src="./$JS"></script>
HTML
echo "Listo: $OUT/campus-uap.html"
