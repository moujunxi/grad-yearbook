import sys
from pypdf import PdfReader

r = PdfReader('test-output.pdf')
print('pages:', len(r.pages))
text = '\n'.join(p.extract_text() or '' for p in r.pages)
checks = {
    'literal_<b>': '<b>' in text,
    'literal_script': '<script>' in text,
    'literal_iframe': '<iframe' in text,
    'literal_svg': '<svg' in text,
    'dollar_text': '$' in text,
    'secret_msg': '神秘留言' in text,
    'name_present': '李四' in text,
    'toc_present': '目' in text or '录' in text,
}
for k, v in checks.items():
    print(f'{k}: {v}')
for i, p in enumerate(r.pages):
    t = (p.extract_text() or '').replace('\n', ' ')[:90]
    print(f'--- page {i+1}: {t}')

# 期望：3 页（封面+目录+1条目），且所有载荷以字面文本出现（已转义渲染）
fail = 0
if len(r.pages) != 3:
    print('FAIL: 页数应为 3')
    fail += 1
for k in ('literal_<b>', 'literal_script', 'literal_iframe', 'literal_svg', 'dollar_text'):
    if not checks[k]:
        print(f'FAIL: {k} 未出现（应为字面文本）')
        fail += 1
print('RESULT:', 'PASS' if fail == 0 else f'{fail} failed')
sys.exit(1 if fail else 0)
