# AI-Powered Educational Platform

A comprehensive educational platform that combines AI chat capabilities with document processing, vector search, and timetable management. Built with Next.js, TypeScript, and Python embedding services.

## 🚀 Features

### Core Features
- **AI Chat Interface**: Intelligent conversation with context-aware responses
- **Document Processing**: Upload and process educational documents with automatic embedding generation
- **Vector Search**: Semantic search through uploaded documents using embeddings
- **Timetable Management**: Admin interface for managing class schedules
- **User Authentication**: Secure login/signup with NextAuth.js
- **Subscription System**: Trial and paid subscription management
- **Achievement System**: Gamified learning with achievement tracking

### Technical Features
- **Real-time Chat**: WebSocket-based chat with message history
- **Math Rendering**: KaTeX integration for mathematical expressions
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Database Integration**: PostgreSQL with Prisma ORM
- **Vector Database**: Astra DB for semantic search
- **File Storage**: Supabase for document storage
- **Embedding Service**: Hosted Python service for text embeddings

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **NextAuth.js** - Authentication solution
- **KaTeX** - Math rendering library

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **Astra DB** - Vector database for embeddings
- **Supabase** - File storage and authentication

### AI & ML
- **Google AI** - Chat completion API
- **Sentence Transformers** - Text embedding generation
- **FastAPI** - Python embedding service
- **Render** - Hosting for embedding service

## 📁 Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── admin/             # Admin interfaces
│   │   ├── auth/              # Authentication pages
│   │   ├── chat/              # Chat interface
│   │   ├── main/              # Main chat page
│   │   └── upload/            # Document upload
│   ├── components/            # Reusable React components
│   ├── lib/                   # Utility libraries
│   └── types/                 # TypeScript type definitions
├── prisma/                    # Database schema and migrations
├── embedding-service/         # Python embedding service
├── scripts/                   # Database setup scripts
└── uploads/                   # Static file uploads
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.11+
- PostgreSQL database
- Supabase account
- Astra DB account

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd your-project-name
```

### 2. Install Dependencies
   ```bash
# Install Node.js dependencies
   npm install

# Install Python dependencies for embedding service
cd embedding-service
pip install -r requirements.txt
cd ..
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Supabase
SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_KEY="your-service-key"

# Astra DB
ASTRA_DB_APPLICATION_TOKEN="your-token"
ASTRA_DB_ENDPOINT="your-endpoint"
ASTRA_DB_COLLECTION="your-collection"

# Google AI
GOOGLE_AI_API_KEY="your-api-key"

# Embedding Service
NEXT_PUBLIC_EMBEDDING_SERVICE_URL="http://localhost:8000"
```

### 4. Database Setup
   ```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Seed database (if needed)
npm run db:seed
```

### 5. Start Development Servers
```bash
# Start Next.js development server
npm run dev

# Start embedding service (in another terminal)
cd embedding-service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 6. Access the Application
- **Frontend**: http://localhost:3000
- **Embedding Service**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Embedding Service Deployment (Render)
1. Push the `embedding-service/` directory to GitHub
2. Create a new Web Service on Render
3. Configure build and start commands
4. Set environment variables

### Database Deployment
- **PostgreSQL**: Use Supabase, Railway, or AWS RDS
- **Astra DB**: Use DataStax Astra for vector storage

## 📚 API Documentation

### Chat API
- `POST /api/chat` - Generate AI responses

### Document API
- `POST /api/process-document` - Process and embed documents
- `GET /api/search` - Search documents semantically

### Authentication API
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login

### Embedding Service API
- `POST /embed` - Generate embeddings for multiple texts
- `POST /embed-single` - Generate embedding for single text
- `GET /health` - Service health check

## 🔧 Configuration

### Environment Variables
See the `.env.local` example above for all required variables.

### Database Configuration
The application uses Prisma for database management. Update `prisma/schema.prisma` for schema changes.

### Embedding Model
Change the embedding model in `embedding-service/main.py`:
```python
model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@yourplatform.com or create an issue in the GitHub repository.

## 🔮 Roadmap

- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Integration with LMS platforms
- [ ] Multi-language support
- [ ] Advanced AI models integration 