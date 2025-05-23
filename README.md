# InputQuest: Learn Language with Comprehensible Input

**InputQuest** is a web-based language learning platform built for learners of the **Polish language**, leveraging the **Comprehensible Input** approach. The app intelligently integrates spaced repetition, YouTube-sourced content, and AI-generated comprehension questions to help users build lasting vocabulary and real-world fluency.

---

## 🚀 Features

- **Vocabulary Tracking & Retention**  
  Uses a **Spaced Repetition System (SRS)** to strengthen long-term memory of vocabulary.

- **YouTube Video Integration**  
  Fetches language videos from YouTube and allows filtering by **comprehensibility level**, topic, and more.

- **Real-Life Vocabulary Prioritization**  
  Recommends commonly encountered vocabulary to optimize your real-world language skills.

- **AI-Generated Comprehension Questions**  
  Generate custom listening questions and receive **instant AI-powered feedback** using the latest LLMs.

---

## Project Structure

```
InputQuest/
├── backend/        # Django REST Framework backend
├── frontend/       # Next.js + Tailwind CSS frontend
└── README.md
```

---

## Backend Setup (Django + PostgreSQL)

### Prerequisites
- Python 3.10
- [Poetry](https://python-poetry.org/)
- PostgreSQL

### 1. Create a `.env` file in the `backend/` directory with the following:

```env
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
SECRET_KEY=your_django_secret_key
OPENAI_API_KEY=your_openai_api_key
DEBUG=True
```

### 2. Install dependencies

```bash
cd backend
poetry install
```

### 3. Apply migrations and run the server

```bash
poetry run python manage.py migrate
poetry run python manage.py runserver
```

---

## 💻 Frontend Setup (Next.js + Tailwind CSS)

### Prerequisites
- Node.js 18+

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Run the development server

```bash
npm run dev
```

---

## 📜 Disclaimer

This project is shared for review and evaluation purposes only. It may not be copied, modified, or used in any way without prior permission.

## 📜 License

No license is included. For usage inquiries, please contact Nathan Yeager at nyeager16@gmail.com.
