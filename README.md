# Vande Mataram Gau Hostel

A comprehensive management system for the Vande Mataram Gau Hostel, featuring cow management, daily milk entry and distribution, member management, and detailed reporting.

## Technology Stack

- **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic
- **Frontend:** React, Vite, TypeScript, Material UI
- **Deployment:** Docker, Docker Compose, Nginx (Ubuntu EC2)

---

## Local Setup Instructions

### 1. Database Setup
Ensure PostgreSQL is installed locally. Create a database for the project:
```sql
CREATE DATABASE gau_hostel_db;
```

### 2. Backend Setup
Navigate to the `Backend` directory and set up the virtual environment:
```bash
cd Backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Update your `DATABASE_URL` in `.env` with your local PostgreSQL credentials.

Run Database Migrations to create tables:
```bash
alembic upgrade head
```

Start the backend development server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
Navigate to the `Frontend` directory and install dependencies:
```bash
cd Frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`.

---

## Production Deployment (AWS EC2 Ubuntu)

This project is configured to coexist gracefully with other applications on an EC2 instance.

### 1. Clone & Configure
Clone the repository to your Ubuntu EC2 server.
Create `.env` in the `Backend` directory using `.env.example` as a template. Make sure to set a secure `SECRET_KEY` and the correct production `DATABASE_URL`.

### 2. Docker Compose
The `docker-compose.yml` file is configured to run on isolated ports to prevent conflicts:
- Backend: `8001`
- Frontend: `3001`
- DB: `5433` (Optional, if using internal postgres)

Run the containers in detached mode:
```bash
docker-compose up -d --build
```

### 3. Run Migrations
Run the Alembic migrations inside the running backend container to generate your production tables:
```bash
docker exec -it gau_hostel_backend alembic upgrade head
```

### 4. Nginx Reverse Proxy Setup
Configure your system-level Nginx (`/etc/nginx/sites-available/gau-hostel`) to reverse proxy requests to the Docker containers:

```nginx
server {
    listen 80;
    server_name gau.yourdomain.com;

    # Proxy frontend requests to port 3001
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }

    # Proxy API requests to port 8001
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/gau-hostel /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```
