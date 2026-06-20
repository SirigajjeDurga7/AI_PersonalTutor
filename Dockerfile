# Stage 1: Build the Vite React Frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
# Point directly inside your frontend-app folder
COPY frontend-app/package*.json ./
RUN npm ci
COPY frontend-app/ .
RUN npm run build

# Stage 2: Set up the production Flask Environment
FROM python:3.12-slim
WORKDIR /app

# Create a non-root user (Required for Hugging Face security rules)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install backend Python dependencies from the backend-app folder
COPY --chown=user backend-app/requirements.txt ./
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy all application source code from backend-app folder
COPY --chown=user backend-app/ ./

# Copy the built React production frontend assets directly into Flask's static assets folder
COPY --chown=user --from=frontend-builder /app/frontend/dist ./static

EXPOSE 7860

# Execute the main entry app script directly
CMD ["python", "app.py"]
