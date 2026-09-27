# StudyMate AI – Student Study Assistant

StudyMate AI is a beginner-friendly web app that helps college students study with three AI tools: note summaries, simple topic explanations, and practice quizzes. It was built as a **ShadowFox AI Engineer Internship** project using Python, Flask, and the OpenAI API.

Open the app at [http://127.0.0.1:5000](http://127.0.0.1:5000) after starting the server.

## Features

- **Summarize Notes** — paste long notes and get revision-friendly headings and bullets
- **Explain Topic** — get a simple definition, main ideas, an example, and a real-world use
- **Generate Quiz** — create 5, 10, or 15 multiple-choice questions at Easy, Medium, or Hard
- Modern purple/blue dashboard with cards, hover animations, and a responsive layout
- Character counters, clear/copy buttons, loading spinner, and friendly error messages
- The OpenAI API key stays on the Flask server and is never sent to the browser

## Technologies used

- Python
- Flask
- HTML5, CSS3, and JavaScript
- OpenAI API
- python-dotenv

## Installation steps

1. Install [Python 3.10+](https://www.python.org/downloads/) if it is not already installed.
2. Open a terminal in the `AI_Student_Assistant` folder.
3. (Optional but recommended) Create a virtual environment:

```bash
python -m venv venv
```

On Windows:

```bash
venv\Scripts\activate
```

On macOS/Linux:

```bash
source venv/bin/activate
```

4. Install dependencies:

```bash
pip install -r requirements.txt
```

## How to create `.env`

In the project root, create a file named `.env` (this repo already includes a template). Put your OpenAI key on one line:

```
OPENAI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with the key from your OpenAI account. Do not put the key in HTML, JavaScript, or screenshots you share.

## How to run the application

From the `AI_Student_Assistant` folder:

```bash
python app.py
```

Then open:

```
http://127.0.0.1:5000
```

## Example usage

1. Click **Start Learning** or the **Summarize Notes** card.
2. Paste a paragraph from a lecture and click **Summarize Notes**.
3. Switch to **Explain Topic**, type `Database Management System`, and generate an explanation.
4. Open **Generate Quiz**, enter `Computer Networks`, choose 5 questions and Medium difficulty, then generate MCQs.
5. Use **Copy** to save the AI result, or **Clear** to reset the result card.

If the API key is missing or the request fails, the result area shows a friendly error instead of crashing.

## Project structure

```
AI_Student_Assistant/
│
├── app.py
├── .env
├── requirements.txt
├── README.md
│
├── templates/
│   └── index.html
│
└── static/
    ├── style.css
    └── script.js
```

- `app.py` — Flask server and `/api/summarize`, `/api/explain`, `/api/quiz` routes
- `.env` — `OPENAI_API_KEY` (server-side only)
- `templates/index.html` — dashboard layout
- `static/style.css` — theme, layout, and animations
- `static/script.js` — feature switching, validation, `fetch()` calls, and result display
