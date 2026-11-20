import chromadb
from pypdf import PdfReader

db = chromadb.PersistentClient(path="db")
collection = db.get_or_create_collection("docs")


def chunk_text(text, size=800, overlap=150):
    chunks, i = [], 0
    while i < len(text):
        chunks.append(text[i:i + size])
        i += size - overlap
    return chunks


def add_pdf(file, name):
    reader = PdfReader(file)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    chunks = chunk_text(text)
    if not chunks:
        return 0
    collection.upsert(
        documents=chunks,
        ids=[f"{name}-{i}" for i in range(len(chunks))],
        metadatas=[{"source": name}] * len(chunks),
    )
    return len(chunks)

def list_docs():
    data = collection.get(include=["metadatas"])
    return sorted({m["source"] for m in data["metadatas"]})


def clear_docs():
    ids = collection.get()["ids"]
    if ids:
        collection.delete(ids=ids)

def search(query, k=4):
    if collection.count() == 0:
        return "Koi document upload nahi hua hai."
    res = collection.query(query_texts=[query], n_results=k)
    return "\n---\n".join(res["documents"][0])
def overview(n=8):
    data = collection.get(limit=n, include=["documents"])
    docs = data["documents"]
    return "\n---\n".join(docs) if docs else "No documents uploaded."