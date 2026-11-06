# Nova – Portfolio Chatbot

AI assistant for Muhammad Tayyab's portfolio.
Backend: Python 3.11.9 + Flask + OpenRouter API. Frontend: HTML, CSS, JavaScript.

## Run in VS Code

1. Install Python 3.11.9 and open this folder in VS Code (File > Open Folder).
2. Open a terminal (Ctrl+`) and create a virtual environment:
   ```
   py -3.11 -m venv .venv          # Windows
   python3.11 -m venv .venv        # macOS / Linux
   ```
3. Activate it:
   ```
   .venv\Scripts\Activate.ps1      # Windows PowerShell
   source .venv/bin/activate       # macOS / Linux
   ```
   (If PowerShell blocks it: `Set-ExecutionPolicy -Scope Process Bypass`)
4. Install packages: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and paste your OpenRouter key (https://openrouter.ai/keys).
6. Start the server: `python app.py` (or press F5 and choose "Run Nova (Flask)").
7. Open http://127.0.0.1:5000 to preview the chat button (bottom-right corner).

## Add Nova to your portfolio

With the Flask server running, paste this before `</body>` in your portfolio's `index.html`:

```html
<script src="http://127.0.0.1:5000/static/widget.js" defer></script>
```

Optional attributes: `data-owner="Muhammad"`, `data-remind="120"` (seconds between reminders), `data-theme="aurora"`.
When you deploy, host the Flask app online, change the URL, and set `ALLOWED_ORIGINS` in `.env` to your portfolio's address.

## Make Nova yours

- `portfolio_data.py` holds all personal info. Fill in the TODO items (email, GitHub, LinkedIn, project links, tech used, job dates).
- `static/widget.css` has 5 color themes (Ocean, Aurora, Emerald, Sunset, Midnight Gold). Visitors switch them with the dots in the chat header. Add or edit themes near the top of the file.
- Change the model in `.env` (`OPENROUTER_MODEL`), any id from https://openrouter.ai/models.

## Project structure

```
nova-chatbot/
├─ app.py              Flask server and OpenRouter call
├─ portfolio_data.py   Your info and Nova's instructions
├─ requirements.txt
├─ .env.example
├─ .vscode/launch.json
└─ static/
   ├─ index.html      preview page
   ├─ widget.css      themes and animations
   └─ widget.js       floating chat widget
```

## Notes

- The API key stays on the server and is never sent to the browser.
- Set `ALLOWED_ORIGINS` to your own domain in production so others can't use your API key through your server.
