# Smart Python Lab (pytrix)

Interactive lessons for two beginner Python topics — **Topic #06 Input & Output** and
**Topic #08 Conditional statements**. Every calculation happens in Python on a Flask
backend, and each page shows the conditions the server checked.

## Project layout

```
pytrix/
├── app.py                     # Flask app: pages + JSON API (also the Vercel entrypoint)
├── requirements.txt           # Python dependencies
├── templates/                 # Jinja2 templates
│   ├── base.html              # shared layout: nav, background canvas, footer
│   ├── home.html              # landing page + quick "can I vote?" demo
│   ├── conditionals.html      # Topic #08 lesson
│   ├── io.html                # Topic #06 lesson
│   ├── about.html             # rules and API reference
│   └── 404.html               # error page
└── public/                    # static files, served straight from the CDN in production
    ├── css/style.css
    └── js/
        ├── main.js            # shared helpers (fetch, toasts, reveal, Three.js background)
        ├── conditionals.js    # voting + grade forms, decision traces, Yes/No flowchart
        └── io.js              # personalized output, calculator, student record, live console
```

`app.py` sets `static_folder="public"` and `static_url_path=""`, so
`url_for('static', filename='css/style.css')` resolves to `/css/style.css` — the same URL
Flask serves locally and the one Vercel's CDN serves in production.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app run --debug
```

Open <http://127.0.0.1:5000>.

## API

| Endpoint | Body | Returns |
| --- | --- | --- |
| `POST /api/vote` | `{"age": 17}` | eligibility, message, years left, `trace` |
| `POST /api/result` | `{"marks": 82}` | pass/fail, grade, message, `trace` |
| `POST /api/personalize` | `{"name":"Asha","age":19,"marks":78}` | printed output lines |
| `POST /api/calc` | `{"expression":"12 * (3 + 4)"}` | result (safe `ast` parser, no `eval`) |
| `POST /api/student` | `{"name":"Asha","age":19,"marks":78}` | generated record |

## Deploy on Vercel

Vercel detects Flask automatically: it finds the `app = Flask(__name__)` instance in
`app.py`, installs `requirements.txt`, and serves `public/**` from the CDN. No
`vercel.json`, `/api` folder or redirect rules are needed (see
[Flask on Vercel](https://vercel.com/docs/frameworks/backend/flask)).

Push to the production branch (`main`) and Vercel deploys it, or deploy manually:

```bash
npm i -g vercel
vercel --prod
```
