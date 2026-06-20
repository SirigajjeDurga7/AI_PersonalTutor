# Stage 1: Build the Vite React Frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
# Look directly at the package files in your root
COPY package*.json ./
RUN npm ci
COPY . .
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

# Install backend Python dependencies directly from root
COPY --chown=user requirements.txt ./
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy all application source code from root
COPY --chown=user . .

# Copy the built React production frontend assets directly into Flask's static assets folder
COPY --chown=user --from=frontend-builder /app/frontend/dist ./static

EXPOSE 7860

# Execute the main entry app script directly
CMD ["python", "app.py"]
