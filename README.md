# FacultyAI - Academic Assistant

FacultyAI is a smart, AI-powered academic assistant built specifically for university faculty. It enables students to ask academic questions in a conversational format and receive AI-generated answers — with the AI trained primarily on internal course materials, lecture notes, and past questions provided by faculty lecturers.

## Features

- Document-Based AI Assistant (RAG Architecture)
- Intelligent File Upload System
- Hybrid Monetization Model (Credits and Subscriptions)
- Device Locking for Security
- Admin Dashboard
- Mobile-Optimized Web Interface

## Tech Stack

- Frontend: Next.js, Tailwind CSS, React
- AI API: OpenAI GPT-4 or Gemini Pro
- Vector Store: Astra DB
- Authentication: NextAuth.js
- Payments: Flutterwave
- Deployment: Vercel/Netlify

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_ASTRA_DB_ID=your_astra_db_id
   NEXT_PUBLIC_ASTRA_DB_REGION=your_astra_db_region
   NEXT_PUBLIC_ASTRA_DB_APPLICATION_TOKEN=your_astra_db_token
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
   FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # Reusable React components
├── lib/             # Utility functions and configurations
├── styles/          # Global styles
└── types/           # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 