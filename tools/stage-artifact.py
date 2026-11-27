#!/usr/bin/env python3
"""
Prepara el build para publicarlo como Artifact de claude.ai (privado).
El visor bloquea JS/CSS propios como archivos externos (CSP): se inlinean en la página.
Tampoco sirve .glb/.ktx2: se publican en base64 (.txt) y un shim de fetch los decodifica.
Uso: ARTIFACT=1 npx vite build && python3 tools/stage-artifact.py <dir-salida>
"""
import base64, glob, os, re, shutil, sys

out = sys.argv[1]
src = 'dist-artifact'
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out)
os.remove(os.path.join(out, 'index.html'))
html = open(os.path.join(src, 'index.html')).read()
js_path = re.search(r'assets/index-[^"]+\.js', html).group(0)
css_path = re.search(r'assets/index-[^"]+\.css', html).group(0)
js = open(os.path.join(src, js_path)).read().replace('</script', '<\\/script')
css = open(os.path.join(src, css_path)).read()
for p in (js_path, css_path):
    os.remove(os.path.join(out, p))
# Con el JS inline, import.meta.url es la página: los assets referenciados como
# new URL('x.json', import.meta.url) deben quedar junto a la página, no en assets/.
for f in os.listdir(os.path.join(out, 'assets')):
    shutil.move(os.path.join(out, 'assets', f), os.path.join(out, f))
os.rmdir(os.path.join(out, 'assets'))
for f in glob.glob(f'{out}/**/*.md', recursive=True):
    os.remove(f)
for f in glob.glob(f'{out}/**/*.glb', recursive=True) + glob.glob(f'{out}/**/*.ktx2', recursive=True):
    open(f + '.txt', 'w').write(base64.b64encode(open(f, 'rb').read()).decode())
    os.remove(f)

shim = r"""
(() => {
  // Errores visibles en pantalla (el visor no muestra la consola).
  const show = (msg) => {
    let el = document.getElementById('boot-error');
    if (!el) {
      el = document.createElement('pre');
      el.id = 'boot-error';
      el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99;max-height:40vh;overflow:auto;margin:0;padding:12px;background:#2a0f12;color:#ffb4b4;font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;border-radius:10px';
      document.body.appendChild(el);
    }
    el.textContent += msg + '\n';
  };
  window.addEventListener('error', (e) => show('Error: ' + (e.message || e.type) + (e.filename ? ' @ ' + e.filename + ':' + e.lineno : '')));
  window.addEventListener('unhandledrejection', (e) => show('Promesa rechazada: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  // Binarios publicados en base64 (.txt).
  const nativeFetch = window.fetch.bind(window);
  const BIN = /\.(glb|ktx2)(\?.*)?$/;
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!BIN.test(url)) return nativeFetch(input, init);
    const res = await nativeFetch(url.replace(BIN, '.$1.txt'), init);
    if (!res.ok) { show('No se pudo cargar ' + url + ' (' + res.status + ')'); return res; }
    const bin = Uint8Array.from(atob(await res.text()), (c) => c.charCodeAt(0));
    return new Response(bin, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
  };
})();
"""
page = f"""<title>Campus UAP 3D</title>
<meta name="theme-color" content="#0b0f14">
<style>:root{{color-scheme:dark}}html,body{{height:100%;background:#0b0f14;color:#f2f4f7}}
{css}</style>
<script>{shim}</script>
<div id="app"></div>
<script type="module">{js}</script>
"""
open(os.path.join(out, 'campus-uap.html'), 'w').write(page)
files = sorted(os.path.relpath(p, out) for p in glob.glob(f'{out}/**/*', recursive=True) if os.path.isfile(p) and not p.endswith('campus-uap.html'))
print(f'página {len(page)/1e6:.1f} MB, {len(files)} archivos')
print('\n'.join(files))
