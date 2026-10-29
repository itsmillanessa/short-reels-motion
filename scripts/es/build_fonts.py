import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
src, out_dir, orig_dir = sys.argv[1], sys.argv[2], sys.argv[3]
extra = set(range(0x00A0,0x0180)) | set(range(0x2010,0x2027)) | {0x00AB,0x00BB,0x20AC,0x2030,0x00B7,0x2026,0x2122}
for w in (500,700,800,900):
    orig = TTFont(f'{orig_dir}/NotoSansSC-{w}.woff'); keep = set(orig.getBestCmap().keys()) | extra
    f = TTFont(src)
    f = instancer.instantiateVariableFont(f, {"wght": w}, inplace=True, updateFontNames=False)
    opts = subset.Options(); opts.flavor='woff'; opts.name_IDs=['*']; opts.notdef_outline=True; opts.hinting=False
    ss = subset.Subsetter(opts); ss.populate(unicodes=sorted(keep)); ss.subset(f)
    # name/weight so the browser treats it like the original file
    f['OS/2'].usWeightClass = w
    f.save(f'{out_dir}/NotoSansSC-{w}.woff')
    chk = TTFont(f'{out_dir}/NotoSansSC-{w}.woff').getBestCmap()
    print(w, 'glifos', len(chk), 'ñ¿«ÁéÜ ok', all(ord(c) in chk for c in 'ñ¿«ÁéÜ'), 'CJK ok', all(ord(c) in chk for c in '示例公司营收'))

# LXGW WenKai (la letra manuscrita de la plantilla whiteboard), mismo criterio:
#   python3 - <<'PY'
#   from fontTools.ttLib import TTFont; from fontTools import subset
#   orig=TTFont('ORIG/fonts/LXGWWenKai-500.woff'); keep=set(orig.getBestCmap())
#   extra=set(range(0x00A0,0x0180))|set(range(0x2010,0x2027))|{0x00AB,0x00BB,0x20AC,0x2030,0x00B7,0x2026,0x2122}
#   f=TTFont('LXGWWenKai-Medium.ttf'); o=subset.Options(); o.flavor='woff'; o.name_IDs=['*']; o.notdef_outline=True; o.hinting=False
#   s=subset.Subsetter(o); s.populate(unicodes=sorted(keep|extra)); s.subset(f); f.save('fonts/LXGWWenKai-500.woff')
#   PY
