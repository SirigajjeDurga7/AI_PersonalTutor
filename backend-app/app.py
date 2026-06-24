from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv
import os
load_dotenv()
# Point Flask to static folder where React files will sit
app = Flask(__name__, static_folder="static", static_url_path="")

# FIX: Allow all cross-origin requests (*) so your frontend can connect seamlessly from any host platform
# Allow CORS requests from Hugging Face space containers natively
CORS(
    app,
    resources={r"/*": {"origins": [
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "*.hf.space",         # Allows Hugging Face direct app embeds
        "*.huggingface.co"    # Allows Hugging Face main site frame access
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

# --- FRONTEND ROUTING ---
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.errorhandler(404)
def not_found(e):
    # This ensures React Router handles nested frontend routing paths seamlessly
    return send_from_directory(app.static_folder, "index.html")
# -----------------------------------------

from routes.auth import auth_bp
app.register_blueprint(auth_bp)

from routes.lms import lms_bp
app.register_blueprint(lms_bp)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
