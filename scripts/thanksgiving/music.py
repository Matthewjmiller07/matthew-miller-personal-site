"""Warm, hymn-like score for the gratitude film: pad + soft plucks + low swell."""
import sys, wave, numpy as np
dur=float(sys.argv[2]); sr=48000; t=np.arange(int(sr*dur))/sr
out=np.zeros_like(t)
def note(f): return 440*2**((f-69)/12)
# chord progression (MIDI roots), 4s each: D  Bm  G  A  D  G  Em A  D
prog=[[50,62,66,69],[47,59,62,66],[43,59,62,67],[45,57,61,64],[50,62,66,69],[43,55,62,67],[40,55,59,64],[45,57,61,67],[50,57,62,66,69]]
seg=dur/len(prog)
for i,ch in enumerate(prog):
    s=int(i*seg*sr); e=min(len(t),int((i+1)*seg*sr+sr*1.5))
    tt=t[s:e]-t[s]; env=np.minimum(1,tt/1.2)*np.exp(-np.maximum(0,tt-seg)/0.8)
    for m in ch:
        f=note(m)
        w=sum(np.sin(2*np.pi*f*k*tt*(1+0.0015*d))/k**1.6 for k in (1,2,3) for d in (-1,1))
        out[s:e]+=0.05*env*w
    # plucks: arpeggio
    arp=ch[1:]+[ch[1]+12]
    for j,m in enumerate(arp):
        ps=s+int(j*seg/len(arp)*sr); pe=min(len(t),ps+int(sr*2.5)); pt=t[ps:pe]-t[ps]
        f=note(m+12)
        out[ps:pe]+=0.06*np.exp(-pt*2.2)*(np.sin(2*np.pi*f*pt)+0.3*np.sin(4*np.pi*f*pt))*np.minimum(1,pt*200)
# fade in/out + gentle reverb-ish smear
out=np.convolve(out, np.exp(-np.arange(int(sr*0.25))/(sr*0.07))*0.02, mode='same')+out
fade=np.minimum(1,t/2.0)*np.minimum(1,(dur-t)/3.0)
out*=fade; out/=np.max(np.abs(out))*1.15
st=np.stack([out,np.roll(out,int(sr*0.012))],1)
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype('<i2').tobytes())
