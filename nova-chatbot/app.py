
"""Nova - Portfolio Chatbot Backend
Python 3.11.9 + Flask + OpenRouter + Render
"""

import os
import requests

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from portfolio_data import PORTFOLIO, build_system_prompt

load_dotenv()

# OpenRouter configuration
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

API_KEY = API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "openai/gpt-4o-mini"
).strip()

SITE_URL = os.getenv(
    "SITE_URL",
    "https://your-portfolio.onrender.com"
)

SITE_NAME = os.getenv(
    "SITE_NAME",
    "Nova - Portfolio Assistant"
)

# Chat settings
MAX_HISTORY = 12
MAX_MESSAGE_CHARS = 1000

# Flask application
app = Flask(
    __name__,
    static_folder="static",
    static_url_path="/static"
)

app.config["MAX_CONTENT_LENGTH"] = 64 * 1024

# CORS configuration
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "*"
).split(",")

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                origin.strip()
                for origin in allowed_origins
                if origin.strip()
            ]
        }
    }
)

SYSTEM_PROMPT = build_system_prompt()


@app.get("/")
def index():
    return send_from_directory(
        app.static_folder,
        "index.html"
    )


@app.get("/api/info")
def info():
    return jsonify({
        "owner": PORTFOLIO["name"],
        "title": PORTFOLIO["title"]
    })


@app.get("/health")
def health():
    return jsonify({
        "status": "healthy",
        "service": "Nova Portfolio Chatbot"
    }), 200


@app.post("/api/chat")
def chat():

    # Check API key
    if not API_KEY:
        return jsonify({
            "error": "Server is missing OPENROUTER_API_KEY."
        }), 500

    # Read request
    data = request.get_json(silent=True) or {}

    incoming = data.get("messages")

    if not isinstance(incoming, list) or not incoming:
        return jsonify({
            "error": "Please send a message."
        }), 400

    # Validate conversation history
    history = []

    for message in incoming[-MAX_HISTORY:]:

        if not isinstance(message, dict):
            continue

        role = message.get("role")
        content = message.get("content")

        if (
            role in ("user", "assistant")
            and isinstance(content, str)
            and content.strip()
        ):
            history.append({
                "role": role,
                "content": content.strip()[:MAX_MESSAGE_CHARS]
            })

    if not history or history[-1]["role"] != "user":
        return jsonify({
            "error": "Please send a valid user message."
        }), 400

    # OpenRouter payload
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            *history
        ],
        "temperature": 0.5,
        "max_tokens": 500
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME
    }

    # Request AI response
    try:
        response = requests.post(
            OPENROUTER_URL,
            json=payload,
            headers=headers,
            timeout=60
        )

    except requests.Timeout:
        return jsonify({
            "error": "AI service timeout. Please try again."
        }), 504

    except requests.RequestException:
        app.logger.exception("OpenRouter connection failed")

        return jsonify({
            "error": "Could not connect to AI service."
        }), 502

    # Handle API errors
    if response.status_code != 200:

        try:
            detail = response.json().get(
                "error", {}
            ).get("message", "")

        except (ValueError, AttributeError):
            detail = ""

        app.logger.error(
            "OpenRouter %s: %s",
            response.status_code,
            detail or response.text[:300]
        )

        if response.status_code == 401:
            message = "Invalid OpenRouter API key."

        elif response.status_code == 402:
            message = "OpenRouter credits are exhausted."

        elif response.status_code == 429:
            message = "Too many requests. Please try again later."

        else:
            message = "AI service returned an error."

        return jsonify({
            "error": message
        }), 502

    # Extract AI response
    try:
        reply = response.json()["choices"][0]["message"]["content"]

        if not isinstance(reply, str):
            raise ValueError("Invalid response content")

        reply = reply.strip()

    except (KeyError, IndexError, ValueError, TypeError):
        return jsonify({
            "error": "Unexpected response from AI service."
        }), 502

    return jsonify({
        "reply": reply or "Please rephrase your question."
    })


# Local development only
if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
