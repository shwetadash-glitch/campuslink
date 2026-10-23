# CAMPUSLINK

An AI-Powered Campus-to-Corporate Placement Management & Analytics Platform.
This platform bridges the gap between students, recruiters, and placement officers by offering comprehensive profiles, job postings, deterministic readiness scoring, and skill-gap analysis.

## Features Currently Implemented (Phases 1-6)
- **Role-Based Workflows**: Tailored portals for Students, Recruiters, Placement Officers, and Super Admins.
- **Student Profiles**: End-to-end management of academic history, projects, verified skills, and resumes.
- **Corporate & Job Management**: Recruiter dashboard to post jobs, manage company profiles, and track applicants.
- **Placement Drives**: Orchestrate placement drives and bulk-register candidates.
- **Student Readiness Engine**: Evaluates a student profile across 7 core employability pillars (Academic, Technical, Projects, Certifications, etc.) and calculates a deterministic readiness score (e.g. 'DEVELOPING', 'READY').
- **Skill-Gap Analysis**: Job-specific skill gap analysis comparing a student's verified skills against a job's requirements.

## Tech Stack
- **Frontend**: Next.js 15, React 19, Tailwind CSS, TypeScript (`frontend/`)
- **Backend (Active)**: Laravel 13 REST API, PHP 8.2+, Sanctum, Eloquent (`backend-laravel/`)
- **Backend (Legacy / Deprecated)**: FastAPI, Python 3.10+, SQLAlchemy, Alembic (`backend/` - superseded by Laravel)
- **Database**: PostgreSQL (Neon Serverless for Production; Docker for local dev) / SQLite (tests)

---

## Local Development Setup Guide

Follow these instructions to set up the project locally on your system.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+ recommended)
- [PHP](https://www.php.net/) (v8.2+ recommended) & [Composer](https://getcomposer.org/)
- [Python](https://www.python.org/downloads/) (v3.10+, for legacy backend and utility scripts)
- [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/shwetadash-glitch/campuslink.git
cd campuslink
```

### 2. Active Backend Setup (Laravel)
The primary backend is built with Laravel 13 (`backend-laravel/`).

1. **Navigate to the Laravel backend directory**:
   ```bash
   cd backend-laravel
   ```
2. **Install PHP Dependencies**:
   ```bash
   composer install
   ```
3. **Configure Environment Variables**:
   Copy the example environment template and generate a local application key:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
4. **Start Local Database & Run Migrations**:
   For local containerized PostgreSQL, start the database service from the repository root:
   ```bash
   # From repository root:
   docker compose up -d db
   ```
   *(The template in `.env.example` pre-configures connection settings matching the local Docker Compose defaults. These defaults are strictly for local development and must never be used in production).*

   Then run database migrations from `backend-laravel/`:
   ```bash
   php artisan migrate
   ```
5. **Start the Laravel Development Server**:
   ```bash
   php artisan serve --port 8000
   ```
   *The API will be available at `http://localhost:8000`.*

### 2b. Legacy Backend Setup (FastAPI - Deprecated / Inactive)
> **Note:** The Python FastAPI backend located in `backend/` is deprecated and has been superseded by `backend-laravel/`. It is retained solely for historical migration reference and tests.

1. **Navigate to the legacy backend directory**:
   ```bash
   cd backend
   ```
2. **Create a Python Virtual Environment**:
   ```bash
   # Windows
   python -m venv venv
   
   # macOS/Linux
   python3 -m venv venv
   ```
3. **Activate the Virtual Environment**:
   ```bash
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```
4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Set up Environment Variables**:
   Create a `.env` file in the `backend` directory (optional for SQLite):
   ```env
   AUTH_JWT_SECRET="your-development-jwt-secret"
   AUTH_JWT_ALGORITHM="HS256"
   # To use Postgres instead of default SQLite, add:
   # DATABASE_URL="postgresql://${LOCAL_DB_USER}:${LOCAL_DB_PASSWORD}@localhost:5432/${LOCAL_DB_NAME}"
   ```
6. **Run Database Migrations (Legacy)**:
   ```bash
   alembic upgrade head
   ```
7. **Start the Legacy Backend Server**:
   ```bash
   fastapi dev src/main.py
   # Or alternatively: python -m uvicorn src.main:app --reload --port 8000
   ```
   *The API will be available at `http://localhost:8000`. You can access the automatic interactive API documentation at `http://localhost:8000/docs`.*

### 3. Frontend Setup
The frontend is built with Next.js App Router.

1. **Open a new terminal and navigate to the frontend directory** (from the root of the project):
   ```bash
   cd frontend
   ```
2. **Install Node Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env.local` file in the `frontend` directory:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:8000"
   ```
4. **Start the Frontend Development Server**:
   ```bash
   npm run dev
   ```
   *The web application will be available at `http://localhost:3000`.*

---

## Accessing the Application

Once both servers are running:
1. Open your browser and go to `http://localhost:3000`
2. You can register as a `STUDENT` or `RECRUITER` from the UI.
3. *Note: `SUPER_ADMIN` or `PLACEMENT_OFFICER` accounts currently must be assigned via database manipulation or by an existing admin.*

### Running Backend Tests
Ensure your virtual environment is active, then run:
```bash
cd backend
python -m pytest tests/
```
