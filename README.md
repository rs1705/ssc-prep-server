# SSC Prep - Backend

Backend service for **SSC Prep**, responsible for flashcard management, filtering, authentication, and user progress APIs.

Built using Node.js, Express.js, and MongoDB following a modular REST API architecture.

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- Firebase Authentication
- REST APIs

---

## Features

- Flashcard CRUD APIs
- Advanced filtering
- Search APIs
- User progress tracking
- Bookmark management
- Authentication middleware
- Validation
- Error handling

---

## Architecture

```
Client
   │
REST APIs
   │
Express.js
   │
Controllers
   │
Services
   │
Models
   │
MongoDB
```

---

## Folder Structure

```
src/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
└── server.js
```

---

## Database

MongoDB stores:

- Flashcards
- Users
- Bookmarks
- Learning Progress

Flashcards contain:

- Word
- Meaning
- Hindi Meaning
- Examples
- Difficulty
- Tags
- Subject
- Exam
- Year

---

## API Modules

### Flashcards

- Get flashcards
- Search flashcards
- Filter flashcards
- Bookmark flashcards

### Users

- User profile
- Progress
- Statistics

---

## Filtering

Supports filtering by:

- Subject
- Exam
- Year
- Difficulty
- Alphabet
- Search
- Tags

Multiple filters can be combined within a single request.

---

## Authentication

Firebase Authentication is used to secure protected endpoints.

Authenticated users can:

- Access personalized study sessions
- Save bookmarks
- Track learning progress

---

## Running Locally

```bash
npm install
npm run dev
```

---

## Environment Variables

```env
PORT=

MONGO_URI=

FIREBASE_PROJECT_ID=

JWT_SECRET=
```

---

## Future Improvements

- Rate limiting
- API documentation using Swagger
- Background jobs
- Redis caching
- Docker support
