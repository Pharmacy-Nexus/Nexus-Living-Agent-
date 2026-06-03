# Nexus Living Agent v0.4 — Render Ready

This is a ready-to-upload Node/Express project for **Nexus Living Agent**, a digital pharmacy cognitive organism prototype.

It uses:
- Groq API as the language brain
- Local pharmacy safety rules
- JSON memory
- Experience learning from feedback
- A dark premium web interface

---

## Upload to GitHub

Upload these files/folders:

- `server.js`
- `package.json`
- `.env.example`
- `.gitignore`
- `render.yaml`
- `public/`
- `README.md`

Do **not** upload your real `.env`.

---

## Deploy on Render

1. Go to Render
2. New → Web Service
3. Connect your GitHub repository
4. Settings:

```text
Build Command:
npm install

Start Command:
npm start
```

5. Environment Variables:

```text
GROQ_API_KEY = your_real_groq_key
GROQ_MODEL = openai/gpt-oss-20b
```

6. Deploy.

---

## Local Run

Create `.env`:

```env
GROQ_API_KEY=your_real_groq_key
GROQ_MODEL=openai/gpt-oss-20b
```

Then:

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

---

## Test Case

```text
A 58-year-old hypertensive patient with uncontrolled blood pressure asks for pseudoephedrine tablets for nasal congestion. He is taking amlodipine and bisoprolol. No current BP reading is available.
```
