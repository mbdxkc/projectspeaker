"""Project Speaker carousel for @valdezkc, Nov. 13, 2026: find my rep, sign the petition.
Run from mBcode/projectspeaker:  python3 campaign/ig-2026-11-13/build.py
Count: live page, 1,176,381 at 3:54 p.m. Central, Nov. 13. Nov. 18 is reported (ABC News,
Bloomberg Government), not announced by the caucus, so the cover carries the attribution.
"""
import base64, subprocess, pathlib
OUT = pathlib.Path("campaign/ig-2026-11-13")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
FONT = b64("fonts/oswald-latin.woff2")
MARK = b64("images/mb-mark.svg")

BASE = f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:Oswald;font-weight:200 700;src:url(data:font/woff2;base64,{FONT}) format('woff2')}}
*{{box-sizing:border-box;margin:0}}
html,body{{width:1080px;height:1350px;overflow:hidden}}
body{{background:#0d1b33;color:#f5f2ea;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;position:relative}}
.pad{{position:absolute;inset:92px 84px}}
.kick{{font:700 30px Oswald;letter-spacing:.16em;text-transform:uppercase;color:#d8b86a}}
.big{{font:700 210px/.92 Oswald;text-transform:uppercase;letter-spacing:.005em;margin-top:30px}}
.h{{font:700 104px/1 Oswald;text-transform:uppercase;margin-top:28px}}
.lede{{font-size:42px;line-height:1.3;color:#f5f2ea;margin-top:40px}}
.mute{{color:#b8c2d3}}
.g{{color:#d8b86a}}
.btn{{display:inline-block;background:#1f4fbf;color:#fff;font:600 40px "Helvetica Neue",Helvetica,sans-serif;padding:26px 44px;border-radius:999px}}
.foot{{position:absolute;left:84px;right:84px;bottom:70px;display:flex;justify-content:space-between;align-items:center;font-size:28px;color:#b8c2d3;border-top:2px solid #2a3d5e;padding-top:28px}}
.foot b{{color:#f5f2ea;font:600 34px Oswald;letter-spacing:.04em}}
.brand{{display:flex;align-items:center;gap:14px;font-size:26px}}
.brand img{{height:34px}}
.step{{display:flex;gap:34px;padding:34px 0;border-top:2px solid #2a3d5e}}
.n{{font:700 52px/1 Oswald;color:#d8b86a;width:70px;flex:none}}
.st{{font-size:40px;line-height:1.28}}
</style></head><body>"""
FOOT = f"""<div class="foot"><b>projectspeaker.org</b><span>Contact your rep before Nov. 18</span></div></body></html>"""

COVER = BASE + """<div class="pad">
  <p class="kick">Project Speaker &middot; America Deserves a Speaker</p>
  <p class="big">Contact<br>your <span class="g">rep.</span></p>
  <p class="lede">House Democrats pick their nominee for speaker by secret ballot on <b class="g">Nov. 18.</b> Call before then and ask for a real contest.</p>
  <p class="mute" style="font-size:26px;margin-top:24px">Date reported by ABC News and Bloomberg Government.</p>
  <p style="margin-top:64px"><span class="btn">Find my representative</span></p>
  <p class="st mute" style="margin-top:22px">One tap at projectspeaker.org.</p>
</div>""" + FOOT

FIND = BASE + """<div class="pad">
  <p class="kick">Find my representative</p>
  <p class="h">One tap.<br>One call.</p>
  <div style="margin:54px 0 46px;display:flex;flex-direction:column;align-items:flex-start;gap:22px">
    <span class="btn" style="background:transparent;border:3px solid #1f4fbf">Find my representative</span>
    <span style="font:700 46px/1 Oswald;color:#d8b86a;padding-left:40px">&darr;</span>
    <span class="btn">Call Rep. Sharice Davids</span>
    <span class="mute" style="font-size:26px">Example: Kansas&rsquo; 3rd District, Kansas City</span>
  </div>
  <div class="step"><span class="n">01</span><p class="st">Tap the button at projectspeaker.org.</p></div>
  <div class="step"><span class="n">02</span><p class="st">Share your location once. The U.S. Census Bureau finds your district. Nothing is stored.</p></div>
</div>""" + FOOT

SAY = BASE + """<div class="pad">
  <p class="kick">Make the call</p>
  <p class="h">It takes<br>a minute.</p>
  <div class="step" style="margin-top:56px"><span class="n">03</span><p class="st">The button dials your representative&rsquo;s Washington office.</p></div>
  <div class="step"><span class="n">04</span><p class="st">Say it plainly:</p></div>
  <p style="font:500 50px/1.22 Oswald;border-left:6px solid #d8b86a;padding-left:34px;margin:6px 0 0 104px">&ldquo;I&rsquo;m a constituent. I want a contested election for speaker.&rdquo;</p>
  <p class="st mute" style="margin-top:60px">No location? Call the Capitol switchboard at <b style="color:#f5f2ea;white-space:nowrap">(202) 224-3121</b> and ask for your representative.</p>
</div>""" + FOOT

SIGN = BASE + """<div class="pad">
  <p class="kick">Sign the petition</p>
  <p style="font:700 190px/1 Oswald;margin-top:40px;letter-spacing:-.01em">1.17M<span class="g">+</span></p>
  <p class="lede" style="margin-top:14px">signatures toward 1.5 million, as of Nov. 13</p>
  <div style="height:10px;background:#2a3d5e;border-radius:6px;margin:44px 0 54px"><div style="width:78.4%;height:100%;background:#d8b86a;border-radius:6px"></div></div>
  <p class="st">&ldquo;House Democrats: CHOOSE A NEW SPEAKER&rdquo; asks every member of the incoming Congress to hold a competitive election for speaker.</p>
  <p style="margin-top:58px"><span class="btn">Sign at projectspeaker.org</span></p>
  <p class="mute" style="font-size:26px;margin-top:30px">Petition by Nicole Whitted on change.org.</p>
</div>""" + FOOT

for i, (name, html) in enumerate([("cover", COVER), ("find", FIND), ("call", SAY), ("sign", SIGN)], 1):
    f = OUT / f"_s{i}.html"; f.write_text(html, encoding="utf-8")
    png = OUT / f"ProjectSpeaker-IG-{i}-{name}.png"
    subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1",
                    "--window-size=1080,1350", "--virtual-time-budget=3000",
                    f"--screenshot={png.resolve()}", f.resolve().as_uri()], check=True, capture_output=True)
    f.unlink(); print("wrote", png)
