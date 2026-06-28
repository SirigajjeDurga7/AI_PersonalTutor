from flask import Flask, jsonify
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

# Allow CORS requests from Hugging Face space containers natively
CORS(
    app,
    resources={r"/*": {"origins": [
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "*.hf.space",         # Allows Hugging Face direct app embeds
        "*.huggingface.co",   # Allows Hugging Face main site frame access
        "*"                   # Dynamic fallback for unrestricted endpoint mesh
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

# --- DEVELOPER STATUS LANDING PAGE ---
@app.route("/")
def serve_index():
    return """
    <html>
        <head>
            <title>Lumina AI Personal Tutor - API Server</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; max-width: 450px; }
                h1 { color: #4e73df; font-size: 26px; margin-bottom: 10px; margin-top: 0; }
                p { color: #666; font-size: 15px; line-height: 1.6; }
                .badge { display: inline-block; background-color: #2e7d32; color: white; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Lumina Backend Node</h1>
                <p>The cloud database and direct authentication gateway endpoints are active. The microservice container has successfully initialized.</p>
                <div class="badge">● Server Active</div>
            </div>
        </body>
    </html>
    """

@app.errorhandler(404)
def not_found(e):
    # FIXED: Returns clear JSON tracking metadata now instead of searching an unbuilt static folder
    return jsonify({"message": "API node endpoint path not registered"}), 404
# ---------------------------------------------------------

from routes.auth import auth_bp
app.register_blueprint(auth_bp)

from routes.lms import lms_bp
app.register_blueprint(lms_bp)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
