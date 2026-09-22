#!/usr/bin/env python3
"""One-shot repair for UTF-8 FFFD corruption in site HTML."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

NAV_BN = (
    '<nav aria-label="Main navigation">'
    '<a href="index.html">হোম</a><a href="explore.html" data-explore>তথ্য অনুসন্ধান</a>'
    '<a href="distribute.html">বরাদ্দ সরঞ্জাম</a><a href="shortage.html">শিক্ষক ঘাটতি</a>'
    '<a href="regions.html">আঞ্চলিক পার্থক্য</a><a href="story.html">আমাদের গল্প</a>'
    '<a href="goals.html">লক্ষ্য</a><a href="sources.html">উৎস</a>'
    '<a href="limitations.html">সীমাবদ্ধতা</a></nav>'
)

NAV_EN = (
    '<nav aria-label="Main navigation">'
    '<a href="index.html">Home</a><a href="explore.html" data-explore>Explore data</a>'
    '<a href="distribute.html">Allocation tool</a><a href="shortage.html">Teacher shortage</a>'
    '<a href="regions.html">Regional differences</a><a href="story.html">Our story</a>'
    '<a href="goals.html">Goals</a><a href="sources.html">Sources</a>'
    '<a href="limitations.html">Limitations</a></nav>'
)

HEADER_WRAP = (
    '<a class="skip-link" href="#main">{skip}</a>\n'
    '  <header class="site-header">\n'
    '    <div class="edition"><span>{edition}</span>'
    '<time id="today" datetime="2026-09-22">২২ সেপ্টেম্বর ২০২৬</time>'
    '<a href="../{page}" class="lang-toggle">English</a></div>\n'
    '    <a class="masthead" href="index.html">Shikkha<span>Ratio</span>'
    '<span class="masthead-note">{note}</span></a>\n'
    '    {nav}\n'
    '  </header>'
)

FOOTER_BN = (
    '<footer><a class="footer-brand" href="index.html">ShikkhaRatio</a>'
    '<p>Made by Tasrik. শিক্ষা সম্পর্কে একটি প্রশ্ন, দৃশ্যমান করা হয়েছে।</p>'
    '<div><a href="sources.html">উৎস</a><a href="limitations.html">সীমাবদ্ধতা</a>'
    '<a href="https://github.com/tasrik0001/ShikkhaRatio">GitHub</a>'
    '<a href="https://banbeis.gov.bd/">BANBEIS</a></div>'
    '<p class="small">স্বাধীন প্রকল্প। সরকারি ড্যাশবোর্ড নয়।</p></footer>'
)

PWA = (
    '  <script src="../js/schema.js"></script>\n'
    '  <script src="../js/pwa-register.js"></script>\n'
    '</body>\n</html>\n'
)

HEAD_START = '''<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{desc}">
  <title>{title} | ShikkhaRatio</title>
  <meta name="theme-color" content="#a12d23">
  <link rel="icon" href="data:,">
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="../style.css">
  {extra_css}
  <script defer src="../site.js"></script>
  {extra_js}
</head>
<body>
'''

EDITION = 'বাংলাদেশ · একটি স্বাধীন ছাত্র প্রকল্প'
NOTE = 'শিক্ষা, জেলা অনুযায়ী দেখা।'
SKIP = 'বিষয়বস্তুতে যান'


def fix_en():
    embed = ROOT / 'embed.html'
    b = embed.read_bytes()
    old = b'800 \xef\xbf\xbd- 600'
    if old in b:
        embed.write_bytes(b.replace(old, b'800 x 600'))
        print('fixed embed.html frame label')
    b = embed.read_bytes()
    if b'\xef\xbf\xbd' in b:
        raise SystemExit('embed still has FFFD')
    print('embed.html clean')

    offline = ROOT / 'offline.html'
    text = offline.read_text(encoding='utf-8')
    bn = (
        '<p class="bangla" lang="bn">'
        'আপনি অফলাইনে আছেন। অফলাইনে যাওয়া সম্ভব নয়। '
        'অনুগ্রহ করে ইন্টারনেট সংযোগ চালু করে আবার চেষ্টা করুন।'
        '</p>'
    )
    text2, n = re.subn(
        r'<p class="bangla" lang="bn">.*?</p>', bn, text, count=1, flags=re.S
    )
    if n != 1:
        raise SystemExit(f'offline bangla not matched: {n}')
    if '�' in text2:
        raise SystemExit('offline still has FFFD after replace')
    offline.write_text(text2, encoding='utf-8', newline='')
    print('fixed offline.html bangla')

    goals = ROOT / 'bn' / 'goals.html'
    gb = goals.read_bytes()
    # শিক্ষ?রা → শিক্ষকরা (U+0995)
    old = b'\xe0\xa6\xb7\xef\xbf\xbd\xe0\xa6\xb0\xe0\xa6\xbe'
    if old in gb:
        gb = gb.replace(old, b'\xe0\xa6\xb7\xe0\xa6\x95\xe0\xa6\xb0\xe0\xa6\xbe')
        goals.write_bytes(gb)
        print('fixed bn/goals.html conjunct')
    # prior wrong fix: শিক্ষআরা → শিক্ষকরা
    wrong = 'বিদ্যমান শিক্ষআরা'.encode('utf-8')
    right = 'বিদ্যমান শিক্ষকরা'.encode('utf-8')
    if wrong in gb:
        goals.write_bytes(gb.replace(wrong, right))
        print('fixed bn/goals.html wrong conjunct')
    gb = goals.read_bytes()
    if b'\xef\xbf\xbd' in gb:
        raise SystemExit('bn/goals still has FFFD')
    if wrong in gb:
        raise SystemExit('bn/goals still has wrong conjunct')
    print('bn/goals.html clean')


def bn_shell(page, title, desc, extra_css='', extra_js='', nav_current=None):
    nav = NAV_BN
    if nav_current:
        nav = nav.replace(
            f'href="{nav_current}"', f'href="{nav_current}" aria-current="page"', 1
        )
    header = HEADER_WRAP.format(
        skip=SKIP, edition=EDITION, page=page, note=NOTE, nav=nav
    )
    return HEAD_START.format(
        desc=desc, title=title, extra_css=extra_css, extra_js=extra_js
    ) + header + '\n  <main id="main">\n'


def write(path, content):
    full = ROOT / path
    full.write_text(content, encoding='utf-8', newline='\n')
    data = full.read_bytes()
    if b'\xef\xbf\xbd' in data:
        raise SystemExit(f'FFFD written to {path}')
    print('wrote', path)


def main():
    fix_en()

    # --- bn/api.html ---
    content = bn_shell(
        'api.html',
        'ডাটা ডাউনলোড',
        'ShikkhaRatio-এর জেলা শিক্ষা সংখ্যা সরল JSON ফাইল হিসেবে ডাউনলোড করুন: ৬৪টি জেলার জন্য বিদ্যালয় ও কলেজ অনুপাত।',
    )
    content += '''
    <article aria-labelledby="article-title">
      <header class="article-header">
        <p class="eyebrow">ডাটা ডাউনলোড / JSON ফাইল</p>
        <h1 id="article-title">আপনার নিজের প্রকল্পের জন্য সংখ্যা প্রস্তুত।</h1>
        <p class="lead">ShikkhaRatio-এর প্রতিটি সংখ্যা দুইবার প্রকাশিত: এই পৃষ্ঠায় এবং সরল JSON ফাইল হিসেবে। ব্রাউজারে লিংক খুলুন, অথবা নিজের সাইট থেকে তুলুন। সংখ্যা শেয়ার করার সময় BANBEIS ২০২৪-এর কৃতজ্ঞতা দিন।</p>
      </header>
      <div class="article-grid">
        <div class="article-body">
          <p class="notice">এগুলো এমন সরল ডাটা ফাইল যেকোনো ওয়েবসাইট পড়তে পারে।</p>
          <p>ফাইলগুলো এই সাইটেই থাকে, তাই যেকোনো পৃষ্ঠা তুলতে পারে। কোনো সাইন-আপ নেই, কী নেই, বিশেষ সেটআপ নেই।</p>
          <h2 id="endpoints">লিংকগুলো</h2>
          <div class="table-scroll">
            <table class="endpoint-table">
              <caption>২০২৪ সালের জেলা অনুযায়ী বিদ্যালয় ও কলেজ সংখ্যা। কপি করতে Copy চাপুন।</caption>
              <thead>
                <tr><th scope="col">Method</th><th scope="col">কী পাবেন</th><th scope="col">ঠিকানা</th><th scope="col">Copy</th></tr>
              </thead>
              <tbody>
                <tr><td>GET</td><td>সাইট সংস্করণ, বিল্ড তারিখ, জাতীয় অনুপাত ও সারি সংখ্যা</td><td><a href="../api/v1/meta.json"><code>/api/v1/meta.json</code></a></td><td><button type="button" class="copy-btn" data-copy="/api/v1/meta.json">Copy</button></td></tr>
                <tr><td>GET</td><td>৬৪টি জেলার বিদ্যালয় সারি</td><td><a href="../api/v1/schools.json"><code>/api/v1/schools.json</code></a></td><td><button type="button" class="copy-btn" data-copy="/api/v1/schools.json">Copy</button></td></tr>
                <tr><td>GET</td><td>৬৪টি জেলার কলেজ সারি</td><td><a href="../api/v1/colleges.json"><code>/api/v1/colleges.json</code></a></td><td><button type="button" class="copy-btn" data-copy="/api/v1/colleges.json">Copy</button></td></tr>
                <tr><td>GET</td><td>একটি জেলা: বিদ্যালয় ও কলেজ, র‍্যাংক ও জাতীয় তুলনা</td><td><a href="../api/v1/districts/dhaka.json"><code>/api/v1/districts/{{slug}}.json</code></a></td><td><button type="button" class="copy-btn" data-copy="/api/v1/districts/dhaka.json">Copy</button></td></tr>
                <tr><td>GET</td><td>খাত অনুযায়ী সর্বনিম্ন, সর্বোচ্চ, মধ্যমা ও গড়</td><td><a href="../api/v1/stats.json"><code>/api/v1/stats.json</code></a></td><td><button type="button" class="copy-btn" data-copy="/api/v1/stats.json">Copy</button></td></tr>
                <tr><td>GET</td><td>প্রকাশিত শীর্ষ ৫ তালিকা এবং ১০ সর্বোচ্চ ও ১০ সর্বনিম্ন জেলা</td><td><a href="../api/v1/top-pressure.json"><code>/api/v1/top-pressure.json</code></a></td><td><button type="button" class="copy-btn" data-copy="/api/v1/top-pressure.json">Copy</button></td></tr>
                <tr><td>GET</td><td>আটটি বিভাগ ও গড় জেলা অনুপাত</td><td><a href="../api/v1/divisions.json"><code>/api/v1/divisions.json</code></a></td><td><button type="button" class="copy-btn" data-copy="/api/v1/divisions.json">Copy</button></td></tr>
              </tbody>
            </table>
          </div>
          <p>প্রতিটি জেলার নিজের ফাইল আছে। নামটি ছোট হাতের অক্ষরে, অ্যাপোস্ট্রফি বাদ দিয়ে, স্পেসকে হাইফেনে বদলে: <a href="../api/v1/districts/dhaka.json"><code>/api/v1/districts/dhaka.json</code></a> এবং <a href="../api/v1/districts/cox-s-bazar.json"><code>/api/v1/districts/cox-s-bazar.json</code></a>। প্রতিটি সারিতে পাথ তৈরির জন্য <code>Slug</code> আছে।</p>
          <h2 id="samples">নমুনা উত্তর</h2>
          <div class="sample-list">
            <details>
              <summary>meta.json: এই সাইট কী প্রকাশ করে</summary>
              <pre><code>{{
  "site": "ShikkhaRatio",
  "version": "0.1.0",
  "datasetYear": 2024,
  "national": {{ "schoolTsr": 30.9, "collegeTsr": 37.1 }},
  "counts": {{ "districts": 64, "divisions": 8, "schoolRows": 64, "collegeRows": 64, "districtFiles": 64 }}
}}</code></pre>
              <p class="sample-note">পূর্ণ ফাইল। শুধু এই ফাইলে জেনারেট করার সময় থাকে।</p>
            </details>
            <details>
              <summary>districts/dhaka.json: দুই খাত, র‍্যাংক ও জাতীয় তুলনা</summary>
              <pre><code>{{
  "slug": "dhaka",
  "district": "Dhaka",
  "school": {{ "TSR": 24.29 }},
  "college": {{ "TSR": 39.73 }},
  "ranks": {{ "school": {{ "byTsr": 53, "of": 64 }}, "college": {{ "byTsr": 29, "of": 64 }} }}
}}</code></pre>
              <p class="sample-note">র‍্যাংক ১ মানে ৬৪ জেলার মধ্যে সর্বোচ্চ অনুপাত। ঋণাত্মক পার্থক্য জাতীয় অনুপাতের নিচে।</p>
            </details>
          </div>
          <h2 id="fields">সংখ্যাগুলো কী বোঝায়</h2>
          <p>বিদ্যালয় ও কলেজ সারির ফিল্ড নাম CSV ডাউনলোডের মতোই, তাই দুই ফরম্যাট মেলে।</p>
          <dl class="field-list">
            <div><dt>Division</dt><dd>আটটি প্রশাসনিক বিভাগের একটি।</dd></div>
            <div><dt>District</dt><dd>৬৪ জেলার একটি।</dd></div>
            <div><dt>Slug</dt><dd>এই জেলার ছোট হাতের ফাইল নাম।</dd></div>
            <div><dt>Inst_Total</dt><dd>জেলার প্রতিষ্ঠান।</dd></div>
            <div><dt>Tchr_Total</dt><dd>শিক্ষক।</dd></div>
            <div><dt>Tchr_Female</dt><dd>নারী শিক্ষক।</dd></div>
            <div><dt>Stud_Total</dt><dd>ছাত্র।</dd></div>
            <div><dt>TSR</dt><dd>প্রতি শিক্ষকে ছাত্র, সাইটজুড়ে দেখানো অনুপাত।</dd></div>
          </dl>
          <h2 id="map">মানচিত্র ফাইল ও স্প্রেডশিট</h2>
          <p>জেলা মানচিত্রের ফাইল বড়, তাই API-তে কপি করা হয়নি। সেটি <a href="../data/bgd-admin2.geojson"><code>data/bgd-admin2.geojson</code></a>-তে আছে। স্প্রেডশিট পছন্দ? CSV ডাউনলোড <a href="sources.html">উৎস</a> পৃষ্ঠায়, এবং কভারেজ সম্পর্কে <a href="limitations.html">সীমাবদ্ধতা</a> পড়ুন।</p>
        </div>
        <aside class="article-aside" aria-labelledby="aside-title">
          <p class="eyebrow">এক নজরে</p>
          <h2 id="aside-title">এই ডাটা সেট</h2>
          <dl class="metrics"><div><dt>বছর</dt><dd>2024</dd></div><div><dt>লিংক</dt><dd>7</dd></div><div><dt>জেলা ফাইল</dt><dd>64</dd></div></dl>
          <p>এক্সপ্লোরারের একই CSV থেকে তৈরি সরল JSON।</p>
          <hr>
          <a href="../api/v1/meta.json">meta.json দিয়ে শুরু করুন</a>
        </aside>
      </div>
      <div class="related" aria-label="Related reading"><a href="sources.html">উৎস দেখুন</a><a href="limitations.html">সীমাবদ্ধতা বুঝুন</a><a href="explore.html" data-explore>সংখ্যা অনুসন্ধান করুন</a></div>
    </article>
  </main>
  {footer}
  <script>
    document.querySelectorAll("[data-copy]").forEach((button) => {{
      button.addEventListener("click", async () => {{
        const url = new URL(button.dataset.copy, window.location.href).href;
        const original = button.textContent;
        try {{
          await navigator.clipboard.writeText(url);
          button.textContent = "Copied";
        }} catch (error) {{
          window.prompt("Copy this address:", url);
        }}
        setTimeout(() => {{ button.textContent = original; }}, 1500);
      }});
    }});
  </script>
  {pwa}
'''.format(footer=FOOTER_BN, pwa=PWA)
    write('bn/api.html', content)

    # --- bn/charts.html ---
    content = bn_shell(
        'charts.html',
        'চার্ট',
        'বাংলাদেশের ২০২৪ সালের বিদ্যালয় ও কলেজ সংখ্যার পাঁচটি সরল চার্ট।',
        extra_css='<link rel="stylesheet" href="../css/charts.css">',
        extra_js='<script defer src="../js/charts.js"></script>',
    )
    content += '''
    <header class="article-header">
      <p class="eyebrow">চার্ট / বাংলাদেশ, ২০২৪</p>
      <h1>একই সংখ্যা, পাঁচভাবে আঁকা।</h1>
      <p class="lead">সবার জন্য সরল চার্ট। মোটা লাইন, স্পষ্ট লেবেল এবং প্রতিটি বারে একটি সংখ্যা, যাতে ছবি শুধু রং দিয়ে নির্ভর না করে।</p>
    </header>
    <div class="chart-facts">
      <div class="chart-fact"><span class="label">মাধ্যমিক বিদ্যালয়</span><strong data-fact="30.9">30.90</strong><span>প্রতি শিক্ষকে ছাত্র</span></div>
      <div class="chart-fact"><span class="label">কলেজ</span><strong data-fact="37.1">37.10</strong><span>প্রতি শিক্ষকে ছাত্র</span></div>
    </div>
    <div class="chart-legend-key" aria-label="চাপের স্তরের রং-কী">
      <span><i class="key-green"></i>প্রতি শিক্ষকে ২৭-এর নিচে ছাত্র</span>
      <span><i class="key-amber"></i>প্রতি শিক্ষকে ২৭ থেকে ৩৫ ছাত্র</span>
      <span><i class="key-red"></i>প্রতি শিক্ষকে ৩৫-এর বেশি ছাত্র</span>
    </div>
    <section aria-labelledby="scatter-title">
      <div class="section-heading"><h2 id="scatter-title">০১ / কোথায় শ্রেণিকক্ষ সবচেয়ে ভিড়</h2><span class="label">৬৪ জেলা</span></div>
      <div class="chart-panel">
        <p class="chart-caption" data-caption="scatter">প্রতিটি বিন্দু একটি জেলা। ডানে যান ছাত্র বাড়ে। উপরে যান প্রতি শিক্ষকের হাতে আরও ছাত্র থাকে। হালকা রেখা জাতীয় সংখ্যা ৩০.৯০-এ। বড় বিন্দু বেশি শিক্ষক দেখায়।</p>
        <div data-chart="scatter" role="img" aria-label="প্রতি শিক্ষকে ছাত্র বনাম মোট ছাত্রের বিন্দু-ছবি"></div>
      </div>
    </section>
    <section aria-labelledby="topbars-title">
      <div class="section-heading"><h2 id="topbars-title">০২ / সর্বাধিক চাপের জেলা</h2><span class="label">শীর্ষ ১৫</span></div>
      <div class="chart-panel">
        <p class="chart-caption" data-caption="topBars">সর্বোচ্চ বিদ্যালয় অনুপাতের ১৫টি জেলা, ব্যস্ততম আগে। হালকা রেখা জাতীয় সংখ্যা, তাই ফাঁকা সহজে দেখা যায়।</p>
        <div data-chart="top-bars" data-limit="15" role="img" aria-label="সর্বোচ্চ প্রতি শিক্ষকে ছাত্রের ১৫ জেলার বার"></div>
      </div>
    </section>
    <section aria-labelledby="divisions-title">
      <div class="section-heading"><h2 id="divisions-title">০৩ / বিভাগের গড়</h2><span class="label">সব বিভাগ</span></div>
      <div class="chart-panel">
        <p class="chart-caption" data-caption="smallMultiples">প্রতিটি বিভাগ একটি ছোট বার, জেলাগুলোর গড়ে, উচ্চ থেকে নিম্ন সাজানো।</p>
        <div data-chart="small-multiples" role="img" aria-label="প্রতি বিভাগের গড় প্রতি শিক্ষকে ছাত্রের ছোট বার চার্ট"></div>
      </div>
    </section>
    <section aria-labelledby="gender-title">
      <div class="section-heading"><h2 id="gender-title">০৪ / কে পড়ায়, কে পড়ে</h2><span class="label">দেশব্যাপী</span></div>
      <div class="chart-panel">
        <p class="chart-caption" data-caption="genderSplit">মাধ্যমিক বিদ্যালয়ের জাতীয় অংশ। একটি বার শিক্ষক, একটি ছাত্র। প্রতিটি অংশে নিজের সংখ্যা আছে।</p>
        <div data-chart="gender-split" role="img" aria-label="নারী শিক্ষক ও মেয়ে ছাত্রের অংশের স্তরযুক্ত বার"></div>
      </div>
    </section>
    <section aria-labelledby="drawer-title">
      <div class="section-heading"><h2 id="drawer-title">০৫ / একটি জেলা দেশের পাশে</h2><span class="label">জেলা ড্রয়ার</span></div>
      <div class="chart-panel">
        <p class="chart-caption" data-caption="districtCompare">একটি জেলা বেছে নিন এবং চারটি পরিমাপ জাতীয় চিত্রের সাথে তুলনা করুন। পূর্ণ বার জেলা, হালকা রেখা দেশ।</p>
        <div class="chart-picker">
          <label for="district-pick">জেলা</label>
          <select id="district-pick"></select>
        </div>
        <div data-chart="district-compare" data-district="Sunamganj" data-picker="district-pick" role="img" aria-label="একটি জেলা ও জাতীয় সংখ্যার তুলনা"></div>
      </div>
    </section>
    <p class="chart-note">তথ্য: BANBEIS 2024। প্রতি শিক্ষকে ছাত্র = মোট ছাত্র / মোট শিক্ষক। অনুপাত পুরো জেলার, একক বিদ্যালয়ের নয়। <a href="sources.html">তথ্য কোথা থেকে</a> · <a href="limitations.html">কীভাবে পড়বেন</a>।</p>
    <noscript><p>এই চার্টে JavaScript লাগে। একই সংখ্যা <a href="explore.html">তথ্য অনুসন্ধান</a> এবং <a href="sources.html">উৎস</a> পৃষ্ঠায় আছে।</p></noscript>
  </main>
  ''' + FOOTER_BN + '\n  ' + PWA
    write('bn/charts.html', content)

    # --- bn/compare.html ---
    content = bn_shell(
        'compare.html',
        'জেলা তুলনা',
        'বাংলাদেশের দুটি জেলা পাশাপাশি: প্রতি শিক্ষকে ছাত্র, শিক্ষক, ছাত্র ও মেয়ে শেয়ার।',
        extra_css='<link rel="stylesheet" href="../css/compare.css">',
        extra_js='<script defer src="../js/compare.js"></script>',
        nav_current='explore.html',
    )
    content += '''
    <header class="article-header">
      <p class="eyebrow">পাশাপাশি / ডাটা সেট ২০২৪</p>
      <h1>দুটি জেলা পাশাপাশি রাখুন</h1>
      <p class="lead">যেকোনো দুটি জেলা বেছে নিন এবং প্রতি শিক্ষকে ছাত্র, কর্মী ও মেয়ে শেয়ার এক স্পষ্ট দৃশ্যে দেখুন। র‍্যাংক ১ মানে সবচেয়ে কম প্রতি শিক্ষকে ছাত্র।</p>
    </header>
    <div class="compare-notice" id="compare-notice" role="status" hidden></div>
    <section aria-labelledby="compare-pick-title">
      <div class="section-heading"><h2 id="compare-pick-title">০১ / দুটি জেলা বেছে নিন</h2><span class="label">৬৪ জেলা · ৮ বিভাগ</span></div>
      <div class="controls compare-controls">
        <div><label for="compare-pick-a">জেলা ক</label><select id="compare-pick-a" class="compare-pick" disabled><option value="">Loading...</option></select></div>
        <div><label for="compare-pick-b">জেলা খ</label><select id="compare-pick-b" class="compare-pick" disabled><option value="">Loading...</option></select></div>
        <button type="button" class="compare-swap" id="compare-swap" disabled>অদলবদল</button>
        <button type="button" class="compare-share" id="compare-share" disabled>শেয়ার লিংক কপি</button>
      </div>
      <p class="small compare-status" id="compare-status" role="status">শিক্ষা তথ্য লোড হচ্ছে...</p>
      <p class="small compare-share-status" id="compare-share-status" role="status"></p>
      <div class="compare-board">
        <article class="compare-card" id="compare-card-a" aria-labelledby="compare-name-a">
          <p class="compare-card-tag">জেলা ক</p>
          <h3 class="compare-card-name" id="compare-name-a">...</h3>
        </article>
        <section class="compare-delta" aria-labelledby="compare-delta-title">
          <p class="compare-card-tag">ফাঁকা</p>
          <h2 id="compare-delta-title">কার আরও শিক্ষক দরকার দেখুন</h2>
          <ul class="compare-delta-list" id="compare-delta-list"></ul>
        </section>
        <article class="compare-card" id="compare-card-b" aria-labelledby="compare-name-b">
          <p class="compare-card-tag">জেলা খ</p>
          <h3 class="compare-card-name" id="compare-name-b">...</h3>
        </article>
      </div>
    </section>
    <section class="compare-bars" aria-labelledby="compare-bars-title">
      <div class="section-heading"><h2 id="compare-bars-title">০২ / সংখ্যাগুলো কীভাবে মেলে</h2><span class="label">বারের দৈর্ঘ্য প্রতিটি সংখ্যা</span></div>
      <div class="compare-bars-frame">
        <div id="compare-bars-list"></div>
      </div>
      <p class="compare-footnote small">BANBEIS 2024 জেলা সারসংক্ষেপ থেকে। <a href="sources.html">উৎস</a> · <a href="limitations.html">অনুপাতে যা থাকে না</a> · <a href="explore.html" data-explore>সব জেলা অনুসন্ধান করুন</a></p>
    </section>
    <noscript><p class="small">এই তুলনায় JavaScript লাগে। <a href="explore.html">ডাটা পৃষ্ঠায় সংখ্যা দেখুন</a> অথবা <a href="index.html">মূল নিবন্ধ পড়ুন</a>।</p></noscript>
  </main>
  ''' + FOOTER_BN + '\n  ' + PWA
    write('bn/compare.html', content)

    # --- bn/distribute.html ---
    content = bn_shell(
        'distribute.html',
        'বরাদ্দ সরঞ্জাম',
        'বিভিন্ন পদ্ধতিতে বাংলাদেশের ৬৪ জেলায় একটি নির্দিষ্ট সংখ্যক শিক্ষক বরাদ্দ করুন।',
        extra_css='<link rel="stylesheet" href="../css/distribute.css">',
        extra_js='<script defer src="../distribute.js"></script>',
        nav_current='distribute.html',
    )
    content += '''
    <header class="article-header">
      <p class="eyebrow">বরাদ্দ সরঞ্জাম / ২০২৪ এর তথ্য</p>
      <h1>আপনি শিক্ষক কীভাবে ভাগ করবেন?</h1>
      <p class="lead">শিক্ষক সংখ্যা লিখুন এবং একটি পদ্ধতি বেছে নিন। সরঞ্জাম দেখাবে প্রতিটি জেলা কত পাবে এবং ভারসায়ন কীভাবে বদলাবে।</p>
    </header>
    <section id="allocator" aria-labelledby="alloc-title">
      <div class="section-heading"><h2 id="alloc-title">০১ / সংখ্যা নির্ধারণ করুন</h2><span class="label">২০২৪ এর জেলা তথ্যের উপর ভিত্তি করে</span></div>
      <div class="controls">
        <div><label for="alloc-sector">খাত</label><select id="alloc-sector"><option value="school">মাধ্যমিক বিদ্যালয়</option><option value="college">কলেজ</option></select></div>
        <div><label for="alloc-count">বরাদ্দ করার মোট শিক্ষক সংখ্যা</label><input id="alloc-count" type="number" min="1" max="500000" value="50000" step="1000"></div>
        <div><label for="alloc-method">বরাদ্দ পদ্ধতি</label><select id="alloc-method">
          <option value="proportional">ছাত্র সংখ্যার সাথে সমানুপাতিক</option>
          <option value="ratio-target">লক্ষ্যমাত্রা অনুপাত</option>
          <option value="shortage-first">অগ্রাধিকার: সর্বোচ্চ ঘাটতি প্রথমে</option>
          <option value="equal">সব ৬৪ জেলায় সমান ভাগ</option>
          <option value="constraint">সর্বোচ্চ অনুপাত প্রথমে লক্ষ্যের দিকে</option>
        </select></div>
        <div><label for="alloc-salary">প্রতি শিক্ষকের মাসিক বেতন (টাকা)</label><input id="alloc-salary" type="number" min="0" max="1000000" value="20000" step="500"></div>
      </div>
      <div id="ratio-target-row" class="controls" style="margin-top:14px" hidden>
        <div><label for="alloc-target">লক্ষ্যমাত্রা: প্রতি শিক্ষকে ছাত্র</label><input id="alloc-target" type="number" min="10" max="80" value="30" step="0.5"></div>
      </div>
      <div id="constraint-row" class="controls" style="margin-top:14px" hidden>
        <div><label for="alloc-goal">লক্ষ্য: প্রতি শিক্ষকে ছাত্র</label><input id="alloc-goal" type="number" min="5" max="80" value="30.9" step="0.1"></div>
        <div><label for="alloc-floor">সর্বনিম্ন অনুপাত</label><input id="alloc-floor" type="number" min="1" max="80" value="15" step="0.5"></div>
        <div><label for="alloc-surplus" class="surplus-label"><input id="alloc-surplus" type="checkbox"> সারপ্লাস ছাড় দিন (সর্বনিম্নের নিচে যেতে পারবে)</label></div>
      </div>
      <p id="alloc-status" role="status" class="small">শিক্ষা তথ্য লোড হচ্ছে...</p>
      <button id="run-alloc" disabled>বরাদ্দ চালান</button>
    </section>
    <section id="alloc-results" hidden aria-labelledby="results-title">
      <div class="section-heading"><h2 id="results-title">০২ / ফলাফল</h2><span class="label" id="results-summary"></span></div>
      <div id="alloc-overview" class="rank-grid"></div>
      <p id="alloc-cost" class="cost-line" role="status" hidden></p>
      <p id="alloc-note" class="help-note" hidden></p>
      <div class="table-scroll">
        <table id="alloc-table">
          <caption>জেলা বরাদ্দ ফলাফল</caption>
          <thead><tr>
            <th scope="col">জেলা</th>
            <th scope="col">বিভাগ</th>
            <th scope="col">ছাত্র</th>
            <th scope="col">বর্তমান শিক্ষক</th>
            <th scope="col">বর্তমান অনুপাত</th>
            <th scope="col">নতুন শিক্ষক</th>
            <th scope="col">নতুন অনুপাত</th>
            <th scope="col">পরিবর্তন</th>
          </tr></thead>
          <tbody id="alloc-body"></tbody>
        </table>
      </div>
      <div class="button-row">
        <button id="download-alloc" class="secondary">ফলাফল CSV ডাউনলোড করুন</button>
        <button id="copy-alloc" class="secondary">TSR পরিবর্তন CSV কপি করুন</button>
        <button id="export-alloc" class="secondary">TSR পরিবর্তন CSV ডাউনলোড করুন</button>
      </div>
    </section>
    <section id="scenarios" aria-labelledby="scenario-title">
      <div class="section-heading"><h2 id="scenario-title">০৩ / সংরক্ষিত পরিকল্পনা</h2><span class="label">এই ডিভাইসে সংরক্ষিত</span></div>
      <div class="controls">
        <div><label for="scenario-name">পরিকল্পনার নাম দিন</label><input id="scenario-name" type="text" maxlength="50"></div>
        <div><button id="save-scenario" class="secondary" disabled>পরিকল্পনা সংরক্ষণ করুন</button></div>
      </div>
      <div id="scenario-list" class="scenario-list"></div>
      <div id="scenario-diff" class="scenario-diff" hidden></div>
    </section>
    <noscript><p>এই সরঞ্জামের জন্য JavaScript প্রয়োজন। <a href="sources.html">উৎস</a> পৃষ্ঠায় নিচে জেলা তথ্য পাওয়া যাবে।</p></noscript>
  </main>
  ''' + FOOTER_BN + '\n  ' + PWA
    write('bn/distribute.html', content)

    # --- bn/district.html ---
    content = bn_shell(
        'district.html',
        'জেলা প্রোফাইল',
        'একটি জেলা প্রোফাইল: বিদ্যালয় ও কলেজে প্রতি শিক্ষকে ছাত্র, র‍্যাংক ও জাতীয় গড়ের সাথে তুলনা।',
        extra_css='<link rel="stylesheet" href="../css/district-profile.css">',
        extra_js='<script defer src="../js/district-profile.js"></script>',
    )
    content += '''
    <header class="article-header">
      <p class="eyebrow">জেলা প্রোফাইল / ২০২৪</p>
      <h1>একটি জেলা। বিদ্যালয় ও কলেজ পাশাপাশি।</h1>
      <p class="lead">একটি জেলা বেছে নিন এবং তার ছাত্র অনুপাত, সব জেলার মধ্যে অবস্থান ও জাতীয় গড়ের সাথে তুলনা দেখুন।</p>
    </header>
    <section id="picker-section" aria-labelledby="picker-title">
      <div class="section-heading"><h2 id="picker-title">০১ / আপনার জেলা বেছে নিন</h2><span class="label">৬৪ জেলা · ৮ বিভাগ</span></div>
      <div class="picker-panel">
        <p id="profile-status" class="status-message quiet" role="status" hidden>জেলা তথ্য লোড হচ্ছে...</p>
        <div id="profile-panel" hidden></div>
        <div id="picker-empty" hidden>
          <h2 class="empty-state">প্রোফাইল দেখতে একটি জেলা বেছে নিন।</h2>
          <p class="empty-hint">নিচের তালিকা থেকে জেলা বেছে নিন, অথবা ড্রপডাউন ব্যবহার করুন।</p>
        </div>
        <div class="picker-controls">
          <div>
            <label for="district-picker">জেলা বাছাই করুন</label>
            <select id="district-picker"><option value="">জেলা বাছুন</option></select>
          </div>
        </div>
        <p class="district-index-title">সব জেলা · বিদ্যালয়ে প্রতি শিক্ষকে ছাত্র</p>
        <ul id="district-index" class="district-index"></ul>
      </div>
    </section>
    <noscript><p>এই প্রোফাইলে JavaScript লাগে। বিকল্পভাবে <a href="explore.html" data-explore>ডাটা পৃষ্ঠায় সংখ্যা দেখুন</a>, অথবা <a href="sources.html#downloads">সম্পূর্ণ ফাইল ডাউনলোড করুন</a>।</p></noscript>
  </main>
  ''' + FOOTER_BN + '\n  ' + PWA
    write('bn/district.html', content)

    # --- bn/embed.html ---
    content = bn_shell(
        'embed.html',
        'এমবেড ও শেয়ার',
        'আরেকটি ওয়েবসাইটে ShikkhaRatio জেলা সংখ্যা ও চার্ট দেখানোর iframe স্নিপেট তৈরি করুন।',
        extra_css='<link rel="stylesheet" href="../css/community.css">',
        extra_js=(
            '<script defer src="../js/export.js"></script>\n'
            '  <script defer src="../js/embed.js"></script>'
        ),
    )
    content += '''
    <header class="article-header">
      <p class="eyebrow">এমবেড ও শেয়ার / ডাটা সেট ২০২৪</p>
      <h1>আপনার নিজের পৃষ্ঠায় জেলা দৃশ্য আনুন।</h1>
      <p class="lead">পৃষ্ঠার ধরন ও একটি জেলা বেছে নিন। নিচের স্নিপেট কপি করে ব্লগ, স্কুল প্রকল্প বা যেকোনো HTML গ্রহণকারী ওয়েবসাইটে পেস্ট করুন।</p>
    </header>
    <section id="embed-builder" aria-labelledby="builder-title">
      <div class="section-heading"><h2 id="builder-title">০১ / স্নিপেট তৈরি করুন</h2><span class="label">নিচে সরাসরি প্রিভিউ</span></div>
      <div class="embed-controls">
        <div>
          <label for="embed-src">এমবেড করার পৃষ্ঠা</label>
          <select id="embed-src">
            <option value="district">জেলা প্রোফাইল (district.html)</option>
            <option value="explore">ডাটা এক্সপ্লোরার (explore.html)</option>
            <option value="charts">চার্ট পৃষ্ঠা (charts.html)</option>
          </select>
        </div>
        <div>
          <label for="embed-district">জেলা</label>
          <input id="embed-district" list="embed-districts" value="Dhaka" autocomplete="off">
          <datalist id="embed-districts"></datalist>
        </div>
      </div>
      <p id="embed-note" class="small" role="status"></p>
      <pre class="embed-snippet"><code id="embed-code"></code></pre>
      <div class="copy-row">
        <button id="embed-copy" type="button">স্নিপেট কপি</button>
        <span id="embed-status" class="status" role="status"></span>
      </div>
    </section>
    <section id="embed-preview-section" aria-labelledby="preview-title">
      <div class="section-heading"><h2 id="preview-title">০২ / সরাসরি দেখুন</h2><span class="label">800 x 600 ফ্রেম</span></div>
      <iframe id="embed-preview" class="preview-frame" src="../district.html?d=dhaka" width="800" height="600" style="border:2px solid #111" title="ShikkhaRatio জেলা দৃশ্য: Dhaka"></iframe>
      <p class="preview-caption">এই প্রিভিউ ঠিক সেভাবেই দেখায় যেভাবে অন্য সাইট দেখাবে। ভিন্ন পৃষ্ঠা দেখতে উপরের নিয়ন্ত্রণ বদলান।</p>
    </section>
    <section id="embed-howto" aria-labelledby="howto-title">
      <div class="section-heading"><h2 id="howto-title">০৩ / কীভাবে কাজ করে</h2><span class="label">অ্যাকাউন্ট লাগে না</span></div>
      <div class="community-panel">
        <p>স্নিপেট এই সাইট থেকে সরাসরি ফ্রেম লোড করে, তাই ডাটা পৃষ্ঠা হালনাগাদ হলে সংখ্যাও হালনাগাদ থাকে। হাতে কোনো সংখ্যা কপি করতে হয় না।</p>
        <p>আপনার পৃষ্ঠার HTML-তে লাইনটি পেস্ট করুন। বেশিরভাগ সাইট বিল্ডার ও ব্লগ কাঁচা HTML ব্লক নেয়। ফ্রেম ৮০০ পিক্সেল চওড়া এবং ৬০০ পিক্সেল উচ্চ, সাইটের সাথে মানানসই মজবুত বর্ডার।</p>
        <p>পাঠক যেন জানেন সংখ্যা কোথা থেকে এসেছে, ফ্রেমের নিচে BANBEIS 2024 এবং ShikkhaRatio উল্লেখ করুন। জেলা প্রোফাইল <code>?d=slug</code> ব্যবহার করে, এক্সপ্লোরার <code>?district=Name</code> দিয়ে খোলে, এবং চার্ট পৃষ্ঠা একই জেলা স্লাগ নেয়।</p>
        <p class="small"><a href="sources.html">উৎস অনুসরণ করুন</a> অথবা শেয়ারের আগে <a href="limitations.html">পরিমাপ সম্পর্কে পড়ুন</a>।</p>
      </div>
    </section>
    <noscript><p>এই স্নিপেট বিল্ডারে JavaScript লাগে। তবুও <a href="sources.html#downloads">সংখ্যা ডাউনলোড</a> বা সরাসরি <a href="explore.html">এক্সপ্লোরারে</a> যেতে পারেন।</p></noscript>
  </main>
  ''' + FOOTER_BN + '\n  ' + PWA
    write('bn/embed.html', content)

    # --- bn/metrics.html ---
    content = bn_shell(
        'metrics.html',
        'সমতা পরিমাপ',
        'বাংলাদেশের ৬৪ জেলায় শিক্ষক কীভাবে ভাগ হয়েছে তার চারটি সহজ ভাষার পরিমাপ।',
        extra_css='<link rel="stylesheet" href="../css/metrics.css">',
        extra_js='<script defer src="../js/metrics.js"></script>',
    )
    content += '''
    <article aria-labelledby="article-title">
      <header class="article-header">
        <p class="eyebrow">সমতা ও ছড়ানো / ডাটা সেট ২০২৪</p>
        <h1 id="article-title">একই ৬৪ জেলা পড়ার চারটি উপায়।</h1>
        <p class="lead">জাতীয় সংখ্যা, বিদ্যালয়ে ৩০.৯০ এবং কলেজে ৩৭.১০, দেশকে এক হিসেবে বর্ণনা করে। এই চারটি পরিমাপ দেখে সেই সংখ্যাগুলো জেলাজুড়ে কীভাবে বসে আছে, এবং প্রতিটির সাথে সহজ ভাষায় একটি পাঠ আছে।</p>
      </header>
      <noscript><p class="metrics-noscript">এই চারটি সংখ্যা আপনার ব্রাউজারে হিসাব হয়, তাই JavaScript লাগে। কাঁচা জেলা ফাইল <a href="sources.html">উৎস পৃষ্ঠায়</a>, এবং জেলার গল্প <a href="regions.html">আঞ্চলিক পার্থক্য</a>-তে।</p></noscript>
      <div class="metrics-strip" aria-label="জাতীয় প্রেক্ষাপট">
        <div><span class="label">বিদ্যালয়, জাতীয়</span><strong>30.90</strong><span class="small">প্রতি শিক্ষকে ছাত্র</span></div>
        <div><span class="label">কলেজ, জাতীয়</span><strong>37.10</strong><span class="small">প্রতি শিক্ষকে ছাত্র</span></div>
        <div><span class="label">জেলা</span><strong>64</strong><span class="small">৮ বিভাগে</span></div>
        <div><span class="label">ডাটা সেট বছর</span><strong>2024</strong><span class="small">BANBEIS তথ্য</span></div>
      </div>
      <p id="metrics-status" class="metrics-status" role="status">জেলা তথ্য পড়া হচ্ছে...</p>
      <div class="metrics-grid">
        <section class="metrics-card" aria-labelledby="equity-title">
          <p class="metrics-index">পরিমাপ ০১ / সমতা</p>
          <h2 id="equity-title">শিক্ষক কতটা সমানভাবে ভাগ হয়েছে</h2>
          <p class="metrics-kicker">৬৪ জেলার বিদ্যালয় অনুপাতের সমতা স্কোর</p>
          <p class="metrics-number"><strong class="metrics-bignum" id="equity-score">...</strong><span class="metrics-unit">১০০ এর মধ্যে</span></p>
          <p class="metrics-chip" id="equity-band">...</p>
          <p class="metrics-caption">স্কোর দেখে জেলা অনুপাতগুলো কতটা একসাথে বসেছে। ১০০ মানে প্রতিটি জেলার অনুপাত এক, তাই কম স্কোর মানে জায়গার মধ্যে বড় ফাঁক।</p>
          <p class="metrics-compare" id="equity-compare">কলেজ: ...</p>
          <details class="metrics-details">
            <summary>এই সংখ্যা কীভাবে হিসাব হয়</summary>
            <p>আমরা ৬৪ জেলার অনুপাত নিয়ে প্রতিটি মাঝের মান থেকে কত দূরে তা বের করি, তারপর সেই ছড়ানোকে মাঝের মান দিয়ে ভাগ করি। এই অনুপাতকে ভেদাঙ্ক সহগ বলে: ছোট সংখ্যা মানে জেলাগুলো কাছাকাছি, বড় সংখ্যা মানে ব্যাপক ছড়ানো। স্কোর ১০০ বিয়োগ সেই সংখ্যা, তাই ১০০ মানে সব জেলা ঠিক এক, আর কম স্কোর মানে বড় ফাঁক। তিনটি ব্যান্ড এই পৃষ্ঠার পাঠ গাইড, অফিসিয়াল স্কেল নয়।</p>
          </details>
        </section>
        <section class="metrics-card" aria-labelledby="corr-title">
          <p class="metrics-index">পরিমাপ ০২ / সম্পর্ক পরীক্ষা</p>
          <h2 id="corr-title">ছাত্র বেশি জেলায় কি ক্লাস বড়?</h2>
          <p class="metrics-kicker">জেলার ছাত্র সংখ্যা ও প্রতি শিক্ষকে ছাত্রের সম্পর্ক, মাধ্যমিক বিদ্যালয়</p>
          <p class="metrics-number"><strong class="metrics-bignum" id="corr-students">...</strong><span class="metrics-unit">সম্পর্ক r</span></p>
          <p class="metrics-chip" id="corr-strength">...</p>
          <p class="metrics-caption" id="corr-reading">...</p>
          <ul class="metrics-sublist">
            <li><span>প্রতিষ্ঠান ও অনুপাত</span><strong id="corr-institutions">...</strong><span class="metrics-sub-read" id="corr-institutions-reading">...</span></li>
            <li><span>নারী শিক্ষকের অংশ ও অনুপাত</span><strong id="corr-women">...</strong><span class="metrics-sub-read" id="corr-women-reading">...</span></li>
          </ul>
          <p class="metrics-small">r -১ থেকে ১ চলে। ০-এর কাছে মানে কোনো নিয়মিত সম্পর্ক নেই।</p>
          <p class="metrics-compare" id="corr-compare">কলেজ: ...</p>
          <details class="metrics-details">
            <summary>এই সংখ্যা কীভাবে হিসাব হয়</summary>
            <p>সম্পর্ক, r লেখা, -১ থেকে ১ চলে। ০-এর কাছে মানে কোনো নিয়মিত সম্পর্ক নেই, ধনাত্মক মানে দুটো একসাথে বাড়ে, ঋণাত্মক মানে একটি বাড়লে অন্যটি নামে। আমরা ৬৪ জেলায় ছাত্র ও অনুপাত, প্রতিষ্ঠান ও অনুপাত, এবং নারী শিক্ষকের অংশ ও অনুপাতের জন্য হিসাব করি। সম্পর্ক শুধু বলে দুটো ধরন একসাথে চলে, কারণ কখনোই প্রমাণ করে না।</p>
          </details>
        </section>
        <section class="metrics-card" aria-labelledby="split-title">
          <p class="metrics-index">পরিমাপ ০৩ / বিভাগ ভাগ</p>
          <h2 id="split-title">অসমতা কোথা থেকে আসছে?</h2>
          <p class="metrics-kicker">মোট অসমতার কত অংশ আট বিভাগের মধ্যে</p>
          <p class="metrics-number"><strong class="metrics-bignum" id="split-between">...</strong><span class="metrics-unit">বিভাগের মধ্যে</span></p>
          <p class="metrics-caption" id="split-caption">...</p>
          <p class="metrics-small" id="split-note">...</p>
          <p class="metrics-compare" id="split-compare">কলেজ: ...</p>
          <details class="metrics-details">
            <summary>এই সংখ্যা কীভাবে হিসাব হয়</summary>
            <p>ভেদাঙ্ক জেলা অনুপাতগুলো গড়ের চারপাশে কতটা ছড়িয়ে তা মাপার একটি উপায়। আমরা সেই ছড়ানো দুই ভাগে ভাগ করি: আট বিভাগের গড়ের মধ্যেকার ফাঁক, এবং একই বিভাগের ভেতরের জেলার ফাঁক। প্রতিটি বিভাগ তার জেলা সংখ্যা অনুযায়ী ওজন পায়, তাই বেশি জেলাওয়ালা বিভাগ মোটে বেশি টানে। দুই অংশ সবসময় ১০০ শতাংশ হয়।</p>
          </details>
        </section>
        <section class="metrics-card" aria-labelledby="move-title">
          <p class="metrics-index">পরিমাপ ০৪ / যদি</p>
          <h2 id="move-title">শিক্ষক কি ভিন্নভাবে নিয়োগ দেওয়া যেত?</h2>
          <p class="metrics-kicker">প্রতিটি জেলা প্রতি শিক্ষকে ৩৫ ছাত্রে নামাতে লাগা শিক্ষক</p>
          <p class="metrics-number"><strong class="metrics-bignum" id="move-need">...</strong><span class="metrics-unit">শিক্ষক</span></p>
          <p class="metrics-caption" id="move-caption">...</p>
          <dl class="metrics-list">
            <div><dt>যেসব জেলা ইতিমধ্যে ৩০.৯০-এর নিচে, ওখান থেকে নেওয়া শিক্ষক</dt><dd id="move-freed">...</dd></div>
            <div><dt>দুই দিক মিলিয়ে নিট</dt><dd id="move-net">...</dd></div>
          </dl>
          <p class="metrics-small" id="move-net-note">...</p>
          <details class="metrics-details">
            <summary>এই সংখ্যা কীভাবে হিসাব হয়</summary>
            <p>এই পরিকল্পনা মাধ্যমিক বিদ্যালয়ের তথ্য ব্যবহার করে, যেখানে জাতীয় গড় ৩০.৯০। প্রতিটি ৩৫-এর উপরের জেলার জন্য ৩৫-এ নামাতে কত শিক্ষক লাগবে গুনে (উপরের সীমা ঠিক থাকে, তাই উপরে গুণি)। জাতীয় গড়ের নিচের প্রতিটি জেলার জন্য ৩০.৯০-এ থেকে কত শিক্ষক ছাড়া যায় গুনে (নিচের সীমা ঠিক থাকে, তাই নিচে গুণি)। নিট দুই গণনা তুলনা করে, এবং এটি হিসাবের হিসেব, কর্মী পরিকল্পনা নয়।</p>
          </details>
        </section>
      </div>
      <div class="related" aria-label="Related reading"><a href="regions.html">জাতীয় গড়ের বাইরে দেখুন</a><a href="explore.html" data-explore>জেলা তুলনা করুন</a><a href="sources.html">উৎস খুঁজুন</a></div>
    </article>
  </main>
  ''' + FOOTER_BN + '\n  ' + PWA
    write('bn/metrics.html', content)

    # --- bn/watchlist.html ---
    content = bn_shell(
        'watchlist.html',
        'ওয়াচলিস্ট',
        'আপনার গুরুত্বপূর্ণ জেলাগুলো সংরক্ষণ করুন এবং তাদের বিদ্যালয় প্রতি শিক্ষকে ছাত্র দ্রুত দেখুন।',
        extra_css='<link rel="stylesheet" href="../css/community.css">',
        extra_js=(
            '<script defer src="../js/export.js"></script>\n'
            '  <script defer src="../js/watchlist.js"></script>'
        ),
    )
    content += '''
    <header class="article-header">
      <p class="eyebrow">আপনার ওয়াচলিস্ট / BANBEIS 2024</p>
      <h1>আপনার গুরুত্বপূর্ণ জেলাগুলো এক জায়গায় রাখুন।</h1>
      <p class="lead">একটি জেলা যোগ করুন, পরে ফিরে আসুন, এবং জাতীয় সংখ্যার পাশে তার বিদ্যালয় অনুপাত দেখুন। তালিকাটি শুধু এই ব্রাউজারে সংরক্ষিত থাকে।</p>
    </header>
    <section id="add-district" aria-labelledby="add-title">
      <div class="section-heading"><h2 id="add-title">০১ / একটি জেলা সংরক্ষণ করুন</h2><span class="label">মাধ্যমিক বিদ্যালয় / ২০২৪</span></div>
      <div class="widget-picker">
        <div>
          <label for="watchlist-district">জেলার নাম</label>
          <input id="watchlist-district" list="watchlist-districts" autocomplete="off" placeholder="নাম লিখুন, যেমন Dhaka">
          <datalist id="watchlist-districts"></datalist>
        </div>
        <div><button id="watchlist-add" type="button">ওয়াচলিস্টে যোগ করুন</button></div>
      </div>
      <p id="watchlist-status" role="status" class="small">জেলা তথ্য লোড হচ্ছে...</p>
    </section>
    <section id="watchlist-view" aria-labelledby="view-title">
      <div class="section-heading"><h2 id="view-title">০২ / আপনার সংরক্ষিত জেলা</h2><span class="label" id="watchlist-count"></span></div>
      <div id="watchlist-empty" class="watchlist-empty">গুরুত্বপূর্ণ জেলা সংরক্ষণ করুন যাতে দ্রুত দেখা যায়।</div>
      <div id="watchlist-table-wrap" class="table-scroll" hidden>
        <table>
          <caption>আপনার সংরক্ষিত জেলার বিদ্যালয় প্রতি শিক্ষকে ছাত্র</caption>
          <thead>
            <tr>
              <th scope="col">জেলা</th>
              <th scope="col">বিদ্যালয় TSR</th>
              <th scope="col">জাতীয়ের তুলনায়</th>
              <th scope="col">র‍্যাংক</th>
            </tr>
          </thead>
          <tbody id="watchlist-body"></tbody>
        </table>
      </div>
      <div class="watchlist-actions">
        <button id="watchlist-clear" class="secondary" type="button" hidden>সব মুছুন</button>
        <button id="watchlist-export" class="secondary" type="button" hidden>CSV ডাউনলোড</button>
      </div>
      <p class="widget-note">র‍্যাংক ১ মানে জেলাগুলোর মধ্যে সবচেয়ে কম প্রতি শিক্ষকে ছাত্র। জাতীয় বিদ্যালয় অনুপাত ৩০.৯০। তালিকাটি localStorage-এ থাকে, তাই প্রথম পরিদর্শনের পরে অফলাইনেও কাজ করে।</p>
    </section>
    <noscript><p>এই ওয়াচলিস্টে JavaScript লাগে। তবুও <a href="sources.html#downloads">সম্পূর্ণ সংখ্যা ডাউনলোড</a> বা <a href="explore.html">সব জেলা অনুসন্ধান</a> করতে পারেন।</p></noscript>
  </main>
  ''' + FOOTER_BN + '\n  ' + PWA
    write('bn/watchlist.html', content)

    # verify all HTML clean of FFFD
    bad = []
    for p in list(ROOT.glob('*.html')) + list((ROOT / 'bn').glob('*.html')):
        if b'\xef\xbf\xbd' in p.read_bytes():
            bad.append(str(p.relative_to(ROOT)))
    if bad:
        raise SystemExit('FFFD remains in: ' + ', '.join(bad))
    print('ALL HTML CLEAN of FFFD')


if __name__ == '__main__':
    main()
