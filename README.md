# Smart Document Agent

A full-stack **agentic RAG** application. Upload PDFs and chat with them in natural language.
The LLM autonomously decides whether to search your documents, use a calculator, or answer directly.

## Features
- Drag-and-drop PDF upload with multi-document support
- Semantic search over document chunks using ChromaDB embeddings
- Tool-calling agent (document search + calculator) with automatic retry on malformed tool calls
- Transparent reasoning: every answer shows which tools the agent used
- Modern React chat UI with Markdown rendering

## Architecture
```
React (Vite) --/api--> FastAPI --> Agent loop (Groq Llama 3.3 70B)
                                      |-- search_documents --> ChromaDB
                                      |-- calculator
```

## Tech Stack
React, Vite, FastAPI, Python, Groq (Llama 3.3 70B), ChromaDB, pypdf

## Getting Started

### Prerequisites
Python 3.10+, Node.js 18+, and a free API key from [console.groq.com](https://console.groq.com)

### 1. Backend
```bash
git clone https://github.com/YOUR_USERNAME/smart-document-agent.git
cd smart-document-agent
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac/Linux
pip install -r requirements.txt
cp .env.example .env           # then paste your Groq key into .env
uvicorn api:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/documents` | List indexed documents |
| POST | `/api/upload` | Upload and index PDFs |
| POST | `/api/chat` | Chat with the agent |
| DELETE | `/api/documents` | Clear the knowledge base |

## Roadmap
- Source citations with page numbers
- Streaming responses
- Web search tool
- Evaluation test set for retrieval accuracy
- Cloud deployment (Render + Vercel)