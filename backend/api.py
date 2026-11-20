from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from rag import add_pdf, list_docs, clear_docs
from agent import run_agent

app = FastAPI(title="Smart Document Agent API")


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


@app.get("/api/documents")
def documents():
    return {"documents": list_docs()}


@app.post("/api/upload")
def upload(files: list[UploadFile] = File(...)):
    results = []
    for f in files:
        n = add_pdf(f.file, f.filename)
        results.append({"name": f.filename, "chunks": n})
    return {"results": results}


@app.post("/api/chat")
def chat(req: ChatRequest):
    history = [m.model_dump() for m in req.messages]
    try:
        answer, tools = run_agent(history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"answer": answer, "tools": tools}


@app.delete("/api/documents")
def clear():
    clear_docs()
    return {"ok": True}