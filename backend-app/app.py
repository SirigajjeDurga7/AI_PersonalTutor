from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv
import os

load_dotenv()

# We look into the main root folder to serve scripts on GitHub natively
app = Flask(__name__, static_folder="../", static_url_path="")

# Allow CORS requests natively
CORS(
    app,
    resources={r"/*": {"origins": [
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "*.hf.space",         
        "*.huggingface.co",   
        "*"                   
    ]}},
    supports_credentials=True
)

app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER")
app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT", 587))
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USE_SSL"] = False
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER")

mail = Mail(app)
app.mail = mail

# --- FIXED FRONTEND SERVING FOR HUGGING FACE (NO BUILD REQUIRED) ---
@app.route("/")
def serve_index():
    # Injecting a direct Vite entry wrapper string layout to map source jsx modules on the fly
    return """
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AI Personal Tutor Platform</title>
        <script type="module">
          // Setup globally shared baseline URLs to skip hardcoding constraints
          window.baseUrl = window.location.origin;
        </script>
        <!-- Load your root CSS styling entry definitions directly -->
        <link rel="stylesheet" href="/frontend-app/src/index.css">
      </head>
      <body style="margin:0; padding:0; background-color:#f4f6f9;">
        <div id="root"></div>
        <!-- Directly source your core React execution script module natively -->
        <script type="module" src="/frontend-app/src/main.jsx"></script>
      </body>
    </html>
    """

@app.errorhandler(404)
def not_found(e):
    # If a path request points to a physical file asset path inside frontend-app, serve it cleanly
    path_str = str(e.description) if hasattr(e, 'description') else ""
    if "frontend-app" in path_str or any(ext in path_str for ext in [".js", ".jsx", ".css", ".svg", ".png"]):
        return send_from_directory(app.static_folder, path_str)
        
    # Standard routing fallback so client-side React Router works flawlessly
    return serve_index()
# ---------------------------------------------------------

from routes.auth import auth_bp
app.register_blueprint(auth_bp)

from routes.lms import lms_bp
app.register_blueprint(lms_bp)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
