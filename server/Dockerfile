# Use Python 3.11
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Force the container to run your FastAPI app
# We use 'server:app' because your file is named server.py and the variable is app
CMD exec uvicorn server:app --host 0.0.0.0 --port $PORT