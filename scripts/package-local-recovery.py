"""Create and verify a local recovery bundle, excluding browser data and credentials."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re, zipfile, sys

ROOT = Path(__file__).resolve().parents[1]
def digest(data): return hashlib.sha256(data).hexdigest()
def verify(path):
    with zipfile.ZipFile(path) as archive:
        manifest = json.loads(archive.read('RECOVERY-MANIFEST.json'))
        expected = {item['path'] for item in manifest['files']}
        assert set(archive.namelist()) == expected | {'RECOVERY-MANIFEST.json'}, 'Archive file set differs from manifest'
        assert len(archive.namelist()) == len(set(archive.namelist())), 'Duplicate archive names'
        for item in manifest['files']:
            name = item['path']
            assert not name.startswith('/') and '..' not in Path(name).parts, 'Unsafe archive path'
            data = archive.read(name)
            assert len(data) == item['bytes'] and digest(data) == item['sha256'], f'Hash mismatch: {name}'
        assert archive.testzip() is None, 'ZIP CRC failed'
        return manifest

if len(sys.argv) == 3 and sys.argv[1] == '--verify':
    result = verify(Path(sys.argv[2]))
    print(f"Verified {result['version']}: {len(result['files'])} files")
    raise SystemExit(0)

source = (ROOT / 'app/archive/page.tsx').read_text(encoding='utf-8')
version = re.search(r"const currentVersion = '(.*?)'", source).group(1)
assert (ROOT / '.local-build/server/wrangler.json').is_file(), 'Run npm run build first'
assert version in (ROOT / '.local-build/client/ui-kit/templates/showcase.html').read_text(encoding='utf-8'), 'Build version differs from source'
blobs = {}
# Deliberate source allow-list: no root static exports, .git, env files, state or private fixtures.
for directory in ['app','components','hooks','lib','public','scripts','.local-build']:
    for path in sorted((ROOT / directory).rglob('*')):
        if not path.is_file(): continue
        relative = path.relative_to(ROOT)
        if path.is_symlink() or any(part in {'.wrangler','__pycache__','.vite'} for part in relative.parts): continue
        if path.name.startswith('.env') or path.name.startswith('.dev.vars') or path.suffix in {'.key','.pem','.p12','.pfx'}: continue
        blobs[relative.as_posix()] = path.read_bytes()
for name in ['package.json','package-lock.json','tsconfig.json','next.config.ts','vite.config.ts','AGENTS.md','.gitignore','components.json']:
    blobs[name] = (ROOT / name).read_bytes()
for name in ['本地档案备份与迁移.md','本地素材与发布核对.md','网站未来构建规划书_2026-10-28.md']:
    blobs['docs/'+name] = (ROOT / 'docs' / name).read_bytes()
# Local configuration needs no hosted Site identity. It carries no account IDs or secrets.
blobs['.openai/hosting.json'] = b'{"d1":null,"r2":null}\n'
blobs['RESTORE.md'] = f'''# Local recovery {version}

This is a local source/build bundle, not a deployment or a complete acceptance claim.
Browser localStorage, personal snapshots, credentials and dependency installations are excluded.

1. Extract into a NEW directory. Do not overwrite an active checkout.
2. Keep the original ZIP and verify it: `python scripts/package-local-recovery.py --verify PATH_TO_ZIP`.
3. Install the locked dependencies with `npm ci` (requires network), then run `npm test`.
4. Run the supplied build using `npm start -- --ip 127.0.0.1 --port 5205`, or rebuild with `npm run build` first.
5. A new port/origin has separate browser storage. Export the original browser archive before migration.
6. Stop a running production preview before rebuilding its files. Existing root static exports and old dist are not included.
7. Keep schema v2 snapshots when testing older code; use an isolated origin and a copy.

Some browser matrix checks and material licenses still require verification before actual publication.
'''.encode('utf-8')
manifest = {'version':version,'createdAt':datetime.now(timezone.utc).isoformat(),'scope':'local source and production build; no browser data','files':[{'path':name,'bytes':len(data),'sha256':digest(data)} for name,data in sorted(blobs.items())]}
folder = ROOT / '.recovery'; folder.mkdir(exist_ok=True)
output = folder / f"knowledge-garden-{version}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.zip"
assert output.resolve().parent == folder.resolve()
with zipfile.ZipFile(output,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for name,data in sorted(blobs.items()): archive.writestr(name,data)
    archive.writestr('RECOVERY-MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
verified = verify(output)
sidecar = output.with_suffix('.sha256'); sidecar.write_text(digest(output.read_bytes())+'  '+output.name+'\n',encoding='utf-8')
print(json.dumps({'path':str(output),'version':verified['version'],'files':len(verified['files']),'bytes':output.stat().st_size,'sha256':digest(output.read_bytes())},ensure_ascii=False))
