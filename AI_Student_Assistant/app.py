"""
StudyMate AI – Student Study Assistant
Flask backend for the ShadowFox AI Engineer internship project.

This file:
- Serves the homepage
- Reads the OpenAI API key from .env (never from the browser)
- Exposes three JSON API routes: summarize, explain, and quiz
"""

import json
import os

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from openai import OpenAI

# Load variables from the .env file into the environment.
load_dotenv()

app = Flask(__name__)

# The secret key stays on the server only.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# Create the OpenAI client once if a key is present.
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# A fast, affordable model that works well for study tasks.
MODEL_NAME = "gpt-4o-mini"


def call_openai(system_prompt, user_prompt, json_mode=False):
    """
    Send a chat completion request to OpenAI.

    Returns (success, data_or_error_message).
    """
    if not client or not OPENAI_API_KEY or OPENAI_API_KEY == "your_api_key_here":
        return False, (
            "OpenAI API key is missing. Add OPENAI_API_KEY to your .env file "
            "and restart the server."
        )

    try:
        kwargs = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.5,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        if not content:
            return False, "The AI returned an empty response. Please try again."
        return True, content.strip()
    except Exception as error:
        # Keep the message friendly; do not leak internal details.
        print("OpenAI error:", error)
        return False, (
            "Could not reach the AI service right now. "
            "Check your API key, internet connection, and try again."
        )


def require_text(payload, field_name, friendly_name):
    """Read and validate a non-empty string from the JSON body."""
    value = payload.get(field_name, "")
    if not isinstance(value, str):
        return None, f"{friendly_name} must be text."
    value = value.strip()
    if not value:
        return None, f"Please enter {friendly_name.lower()} before generating."
    return value, None


@app.route("/")
def home():
    """Render the main dashboard page."""
    return render_template("index.html")


@app.route("/api/summarize", methods=["POST"])
def summarize_notes():
    """Summarize pasted study notes for easy revision."""
    payload = request.get_json(silent=True) or {}
    notes, error = require_text(payload, "notes", "Your study notes")
    if error:
        return jsonify({"success": False, "error": error}), 400

    system_prompt = (
        "You are a helpful study assistant for college students. "
        "Write clear revision notes using headings and bullet points."
    )
    user_prompt = (
        "Summarize the following study notes for a college student. "
        "Keep the important concepts, definitions and key points. "
        "Use headings and bullet points. Make it easy to revise.\n\n"
        f"{notes}"
    )

    ok, result = call_openai(system_prompt, user_prompt)
    if not ok:
        return jsonify({"success": False, "error": result}), 502
    return jsonify({"success": True, "result": result})


@app.route("/api/explain", methods=["POST"])
def explain_topic():
    """Explain a topic in simple language with examples."""
    payload = request.get_json(silent=True) or {}
    topic, error = require_text(payload, "topic", "A topic")
    if error:
        return jsonify({"success": False, "error": error}), 400

    system_prompt = (
        "You are a patient tutor for college students. "
        "Explain ideas simply, without unnecessary jargon."
    )
    user_prompt = (
        "Explain the following topic to a college student in very simple language. Include:\n"
        "- Simple definition\n"
        "- Main concepts\n"
        "- Easy example\n"
        "- Important points\n"
        "- Short real-world application\n"
        "Avoid unnecessary complexity.\n\n"
        f"Topic: {topic}"
    )

    ok, result = call_openai(system_prompt, user_prompt)
    if not ok:
        return jsonify({"success": False, "error": result}), 502
    return jsonify({"success": True, "result": result})


@app.route("/api/quiz", methods=["POST"])
def generate_quiz():
    """Generate multiple-choice practice questions for a topic."""
    payload = request.get_json(silent=True) or {}
    topic, error = require_text(payload, "topic", "A topic")
    if error:
        return jsonify({"success": False, "error": error}), 400

    # Allow only the dropdown values from the frontend.
    try:
        number = int(payload.get("number", 5))
    except (TypeError, ValueError):
        number = 5
    if number not in (5, 10, 15):
        number = 5

    difficulty = str(payload.get("difficulty", "Medium")).strip().title()
    if difficulty not in ("Easy", "Medium", "Hard"):
        difficulty = "Medium"

    system_prompt = (
        "You are a quiz generator for college students. "
        "Return valid JSON only."
    )
    user_prompt = (
        f"Create {number} multiple-choice questions about {topic}.\n"
        f"Difficulty: {difficulty}.\n"
        "Each question should have 4 options.\n"
        "Clearly identify the correct answer.\n"
        "Also provide a short explanation for the correct answer.\n\n"
        "Return JSON with this exact shape:\n"
        "{\n"
        '  "questions": [\n'
        "    {\n"
        '      "question": "string",\n'
        '      "options": ["A text", "B text", "C text", "D text"],\n'
        '      "correct": "A" or the matching option text,\n'
        '      "explanation": "string"\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    ok, result = call_openai(system_prompt, user_prompt, json_mode=True)
    if not ok:
        return jsonify({"success": False, "error": result}), 502

    try:
        quiz_data = json.loads(result)
        questions = quiz_data.get("questions", [])
        if not isinstance(questions, list) or not questions:
            raise ValueError("No questions in response")
    except (json.JSONDecodeError, ValueError):
        # If JSON parsing fails, still return the raw text so the student sees something.
        return jsonify({"success": True, "result": result, "quiz": None})

    return jsonify({"success": True, "result": result, "quiz": questions})


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"success": False, "error": "That page or route was not found."}), 404


@app.errorhandler(500)
def server_error(_error):
    return jsonify({"success": False, "error": "Something went wrong on the server."}), 500


if __name__ == "__main__":
    # Run locally at http://127.0.0.1:5000
    app.run(host="127.0.0.1", port=5000, debug=True)
