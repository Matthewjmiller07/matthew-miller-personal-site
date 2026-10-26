import json,subprocess,os
eps=json.load(open('episodes.json'))
for e in eps:
    u=e['transcripts'].get('application/x-subrip')
    out=f"srt/{e['guid']}.srt"
    if u and not os.path.exists(out):
        subprocess.run(['curl','-sL','-o',out,u],check=True)
print('ok')
