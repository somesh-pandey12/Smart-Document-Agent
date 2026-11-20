import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const SUGGESTIONS = [
  { title: "Summarize", text: "Summarize this document in 5 bullet points" },
  { title: "Key topics", text: "What are the key topics covered in the document?" },
  { title: "Findings", text: "List the main conclusions or findings" },
  { title: "Calculate", text: "What is 18% of 2,450?" },
];

const Icon = {
  logo: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
      <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2m-1 0v14H9V6" />
    </svg>
  ),
  tool: (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 005.4 5.4L12 19.8a2.8 2.8 0 01-4-4z" />
    </svg>
  ),
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  const notify = (text, type = "info") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadDocs = async () => {
    try {
      const r = await fetch("/api/documents");
      const d = await r.json();
      setDocs(d.documents);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const uploadFiles = async (fileList) => {
    const pdfs = Array.from(fileList).filter((f) => f.type === "application/pdf");
    if (!pdfs.length) return notify("Please select PDF files only.", "error");

    const form = new FormData();
    pdfs.forEach((f) => form.append("files", f));

    setUploading(true);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: form });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const chunks = d.results.reduce((a, x) => a + x.chunks, 0);
      notify(`${pdfs.length} file(s) indexed (${chunks} chunks)`, "success");
      await loadDocs();
    } catch {
      notify("Upload failed. Is the backend running?", "error");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  };

  const clearDocs = async () => {
    await fetch("/api/documents", { method: "DELETE" });
    setDocs([]);
    notify("All documents removed", "success");
  };

  const send = async (override) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const updated = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated
            .filter((m) => !m.error)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Request failed");
      setMessages([...updated, { role: "assistant", content: d.answer, tools: d.tools }]);
    } catch (err) {
      setMessages([
        ...updated,
        { role: "assistant", content: err.message || "Something went wrong.", error: true },
      ]);
    }
    setLoading(false);
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">{Icon.logo}</div>
          <div>
            <div className="brand-name">Smart Document Agent</div>
            <div className="brand-sub">Agentic RAG Assistant</div>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => uploadFiles(e.target.files)}
        />

        <div
          className={`dropzone ${dragging ? "drag" : ""} ${uploading ? "busy" : ""}`}
          onClick={() => !uploading && fileRef.current.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {uploading ? <div className="spinner" /> : Icon.upload}
          <strong>{uploading ? "Indexing documents..." : "Upload PDFs"}</strong>
          <span>{uploading ? "This may take a moment" : "Drag & drop or click to browse"}</span>
        </div>

        <div className="section-title">
          <span>Knowledge Base</span>
          <span className="count">{docs.length}</span>
        </div>

        <ul className="docs">
          {docs.length === 0 && <li className="muted">No documents yet</li>}
          {docs.map((d) => (
            <li key={d}>
              {Icon.file}
              <span title={d}>{d}</span>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          {docs.length > 0 && (
            <button className="btn ghost danger" onClick={clearDocs}>
              {Icon.trash} Remove all documents
            </button>
          )}
          <button className="btn ghost" onClick={() => setMessages([])} disabled={!messages.length}>
            New chat
          </button>
          <div className="health">
            <span className={`dot ${online ? "on" : "off"}`} />
            {online ? "Backend connected" : "Backend offline"}
          </div>
        </div>
      </aside>

      <main className="chat">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="hero">
              <div className="hero-badge">Powered by Llama 3.3 · ChromaDB · FastAPI</div>
              <h1>
                Chat with your <span className="grad">documents</span>
              </h1>
              <p>
                Upload PDFs and ask questions in natural language. The agent decides on its own
                whether to search your documents, run a calculation, or answer directly.
              </p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s.title} className="card" onClick={() => send(s.text)}>
                    <b>{s.title}</b>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="thread">
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div className={`avatar ${m.role}`}>{m.role === "user" ? "U" : Icon.logo}</div>
                  <div className={`bubble ${m.error ? "error" : ""}`}>
                    {m.role === "assistant" && !m.error ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      m.content
                    )}
                    {m.tools?.length > 0 && (
                      <div className="tools">
                        {m.tools.map((t, j) => (
                          <span key={j} className="tag">
                            {Icon.tool} {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="msg assistant">
                  <div className="avatar assistant">{Icon.logo}</div>
                  <div className="bubble">
                    <div className="dots">
                      <span /> <span /> <span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="inputwrap">
          <div className="inputbar">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything about your documents..."
            />
            <button className="send" onClick={() => send()} disabled={loading || !input.trim()}>
              {Icon.send}
            </button>
          </div>
          <div className="hint">Press Enter to send · Shift + Enter for a new line</div>
        </div>
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
    </div>
  );
}