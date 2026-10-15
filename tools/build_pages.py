"""Build the GitHub Pages copies from the app sources.

index.html            <- apps/team-match/index.html (A-League)
world-cup/index.html  <- apps/tournament/index.html (Rugby League World Cup)


apps/team-match/index.html is the claude.ai artifact source: page content only, no <html>/<head>.
GitHub Pages needs a full document, plus the manifest and icons so a phone can save it as an app.
Run after every change to the app:  python3 tools/build_pages.py
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
HEAD = """<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#16141f">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="@TITLE@">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="@UP@icons/icon-192.png">
<link rel="apple-touch-icon" href="@UP@icons/apple-touch-icon.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
<!-- Built from @SRC@ by tools/build_pages.py. Edit the source, not this file. -->
"""
for src, out, title, up in [("apps/team-match/index.html", "index.html", "Sports", ""),
                            ("apps/tournament/index.html", "world-cup/index.html", "World Cup", "../")]:
    app = (root / src).read_text(encoding="utf-8")
    head = HEAD.replace("@TITLE@", title).replace("@UP@", up).replace("@SRC@", src)
    (root / out).parent.mkdir(parents=True, exist_ok=True)
    (root / out).write_text(head + app + "\n</body>\n</html>\n", encoding="utf-8")
    print("wrote", out)
