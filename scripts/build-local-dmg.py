#!/usr/bin/env python3
"""Package a built macOS app locally using diskutil (macOS 27+)."""
import argparse
import ctypes
from contextlib import contextmanager
import glob
import hashlib
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent


def run(*args, **kwargs):
    return subprocess.run(list(map(str, args)), check=True, **kwargs)


def resolve_alias(data):
    """Check the background with macOS's own resolver, without displaying UI."""
    cs = ctypes.CDLL('/System/Library/Frameworks/CoreServices.framework/CoreServices')
    cs.NewHandle.argtypes = [ctypes.c_long]
    cs.NewHandle.restype = ctypes.POINTER(ctypes.c_void_p)
    cs.FSResolveAliasWithMountFlags.argtypes = [ctypes.c_void_p, ctypes.c_void_p,
                                               ctypes.c_void_p, ctypes.c_void_p, ctypes.c_ulong]
    cs.FSRefMakePath.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint32]
    cs.DisposeHandle.argtypes = [ctypes.c_void_p]
    handle = cs.NewHandle(len(data))
    if not handle:
        raise RuntimeError('Could not allocate background alias')
    try:
        ctypes.memmove(handle.contents.value, data, len(data))
        ref, changed, path = ctypes.create_string_buffer(80), ctypes.c_ubyte(), ctypes.create_string_buffer(4096)
        status = cs.FSResolveAliasWithMountFlags(None, handle, ref, ctypes.byref(changed), 1)
        if status or cs.FSRefMakePath(ref, path, len(path)):
            raise RuntimeError(f'macOS could not resolve background alias ({status})')
        return Path(os.fsdecode(path.value))
    finally:
        cs.DisposeHandle(handle)


def write_layout(mount, alias_type, store_type):
    alias = alias_type.for_file(str(mount / '.background.png')).to_bytes()
    # Long/non-ASCII volume names can be truncated in the legacy alias header.
    alias_type.from_bytes(alias)
    if resolve_alias(alias).resolve() != (mount / '.background.png').resolve():
        raise RuntimeError('Background alias resolved outside this image')
    with store_type.open(str(mount / '.DS_Store'), 'w+') as store:
        # Match dmgbuild's complete Finder view schema, including its version.
        store['.']['vSrn'] = ('long', 1)
        store['.']['bwsp'] = dict(ShowStatusBar=False, WindowBounds='{{400, 200}, {960, 640}}',
                                 ContainerShowSidebar=False, PreviewPaneVisibility=False,
                                 SidebarWidth=0, ShowTabView=False, ShowToolbar=False,
                                 ShowPathbar=False, ShowSidebar=False)
        store['.']['icvp'] = dict(viewOptionsVersion=1, backgroundType=2,
                                 backgroundColorRed=1., backgroundColorGreen=1., backgroundColorBlue=1.,
                                 backgroundImageAlias=alias, gridOffsetX=0., gridOffsetY=0.,
                                 gridSpacing=100., arrangeBy='none', showIconPreview=False,
                                 showItemInfo=False, labelOnBottom=True, textSize=16.,
                                 iconSize=88., scrollPositionX=0., scrollPositionY=0.)
        store['.']['icvl'] = ('type', b'icnv')
        for name, position in {'Goose Note.app': (240, 270), 'Applications': (720, 270),
                               '安装指令.command': (480, 470), '.background.png': (1200, 100),
                               '.VolumeIcon.icns': (1380, 100), '.DS_Store': (1560, 100)}.items():
            store[name]['Iloc'] = position


@contextmanager
def attach(image):
    # A dedicated mount path lets us detach even if plist parsing fails.
    mount = Path(tempfile.mkdtemp(prefix='goose-dmg-mount-'))
    device = None
    try:
        result = run('diskutil', 'image', 'attach', '--nobrowse', '--mountPoint', mount,
                     '--plist', image, capture_output=True, timeout=180)
        entities = plistlib.loads(result.stdout)['system-entities']
        device = entities[0]['dev-entry']
        actual_mount = Path(next(x['mount-point'] for x in entities if 'mount-point' in x))
        yield actual_mount
    finally:
        if device:
            run('diskutil', 'eject', device)
        elif os.path.ismount(mount):
            run('hdiutil', 'detach', mount)
        mount.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', type=Path, default=ROOT / 'dist-electron/packaged/mac-arm64/Goose Note.app')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    info = plistlib.loads((args.app / 'Contents/Info.plist').read_bytes())
    if info.get('CFBundleIdentifier') != 'com.goosenote.desktop':
        raise RuntimeError('Unexpected application bundle')
    title = 'Goose Note ' + info['CFBundleShortVersionString'] + ' Setup'
    if not title.isascii() or len(title.encode()) > 27:
        raise RuntimeError('DMG volume title must be ASCII and at most 27 bytes')
    modules = sorted(glob.glob(str(Path.home() / 'Library/Caches/electron-builder/dmg-builder@*/*/python/lib/python*/site-packages')))
    if not modules:
        raise RuntimeError('Run electron-builder once to install its DMG dependencies')
    sys.path.insert(0, modules[-1])
    from ds_store import DSStore
    from mac_alias import Alias
    args.output = args.output.expanduser().resolve()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    checksum = args.output.with_suffix('.dmg.sha256')
    for destination in (args.output, checksum):
        if destination.exists():
            raise FileExistsError(destination)
    run('codesign', '--verify', '--deep', '--strict', args.app)
    with tempfile.TemporaryDirectory(prefix='goose-local-dmg-', dir=args.output.parent) as work:
        raw, result = Path(work) / 'work.dmg', Path(work) / 'result.dmg'
        run('diskutil', 'image', 'create', 'blank', '--format', 'RAW', '--size', '1g',
            '--volumeName', title, '--fs', 'APFS', raw, timeout=240)
        with attach(raw) as mount:
            run('ditto', args.app, mount / 'Goose Note.app')
            for source, name in [('electron/installer/background.png', '.background.png'),
                                 ('electron/icons/icon.icns', '.VolumeIcon.icns'),
                                 ('electron/installer/安装指令.command', '安装指令.command')]:
                shutil.copy2(ROOT / source, mount / name)
            (mount / 'Applications').symlink_to('/Applications')
            write_layout(mount, Alias, DSStore)
            run('SetFile', '-a', 'C', mount)
            run('codesign', '--verify', '--deep', '--strict', mount / 'Goose Note.app')
        run('diskutil', 'image', 'create', 'from', '--format', 'UDZO', raw, result, timeout=180)
        run('hdiutil', 'verify', result, timeout=60)
        with attach(result) as mount:
            with DSStore.open(str(mount / '.DS_Store'), 'r') as store:
                if store['.']['vSrn'] != (b'long', 1):
                    raise RuntimeError('Final DMG is missing the Finder view version')
                options = store['.']['icvp']
                if any(options.get('backgroundColor' + channel) != 1. for channel in ('Red', 'Green', 'Blue')):
                    raise RuntimeError('Final DMG background colors are missing')
                if options['backgroundType'] != 2 or options['iconSize'] != 88.:
                    raise RuntimeError('Final DMG icon view settings are invalid')
                resolved = resolve_alias(store['.']['icvp']['backgroundImageAlias'])
            if resolved.resolve() != (mount / '.background.png').resolve():
                raise RuntimeError('Final DMG background reference is invalid')
            run('codesign', '--verify', '--deep', '--strict', mount / 'Goose Note.app')
        hasher = hashlib.sha256()
        with result.open('rb') as image_file:
            for chunk in iter(lambda: image_file.read(1024 * 1024), b''):
                hasher.update(chunk)
        digest = hasher.hexdigest()
        # Exclusive creation preserves an existing sidecar, including a late arrival.
        with checksum.open('x') as sidecar:
            sidecar.write(f'{digest}  {args.output.name}\n')
        try:
            os.link(result, args.output)
        except BaseException:
            checksum.unlink()
            raise
    print(f'Created and verified: {args.output}')


if __name__ == '__main__':
    main()
