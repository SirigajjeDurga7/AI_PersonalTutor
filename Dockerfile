# Step 1: Build the Vite React Frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend-app/package*.json ./
RUN npm ci
COPY frontend-app/ .
RUN npm run build

# Step 2: Set up the Python Backend Environment
FROM python:3.11-slim
WORKDIR /app

# Create a non-root user (Required for Hugging Face security rules)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install backend dependencies
COPY --chown=user backend-app/requirements.txt ./backend-app/
RUN pip install --no-cache-dir --upgrade -r backend-app/requirements.txt

# Copy backend application source code
COPY --chown=user backend-app/ ./backend-app/

# Copy the built React frontend files directly into your backend's static folder
# (Adjust the destination folder if your python server looks elsewhere)
COPY --chown=user --from=frontend-builder /app/frontend/dist ./backend-app/static

# Expose Hugging Face's mandatory web routing port
EXPOSE 7860

# Launch your backend server on port 7860
# (Assumes your backend uses app.py with uvicorn/fastapi/flask)
CMD ["python", "backend-app/app.py"]
