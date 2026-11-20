import os
import json
import re
from dotenv import load_dotenv
from groq import Groq, BadRequestError
from rag import search, overview

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

SYSTEM = (
    "You are Smart Document Agent, a professional AI assistant. "
    "If the user's question relates to uploaded documents, use the document tools and "
    "answer ONLY from the retrieved content. If the answer is not in the documents, say so clearly. "
    "For general questions like 'summarize', 'what is this about' or 'give an overview', "
    "call get_document_overview. "
    "For specific questions, call search_documents with a specific, descriptive query "
    "(never vague words like 'contents' or 'summary'). "
    "Use the calculator tool for any math. For greetings or general chat, answer directly without tools. "
    "Reply in clear, well-structured English using Markdown (short paragraphs, bullet points)."
)

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": "Searches the uploaded PDF documents and returns the most relevant passages",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Specific search query"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Evaluates a math expression such as 12*(5+3)",
            "parameters": {
                "type": "object",
                "properties": {"expression": {"type": "string"}},
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_document_overview",
            "description": "Returns the opening sections of the uploaded documents. Use this for general questions like 'summarize', 'what is this document about', or 'give an overview'.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


def calculator(expression):
    if not re.fullmatch(r"[0-9+\-*/(). %]+", expression):
        return "Only numbers and basic operators are allowed."
    try:
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"


def run_tool(name, args):
    if name == "search_documents":
        return search(args.get("query", ""))
    if name == "calculator":
        return calculator(args.get("expression", ""))
    if name == "get_document_overview":
        return overview()
    return "Unknown tool"


def call_llm(messages, use_tools=True):
    kwargs = {"model": MODEL, "messages": messages}
    if use_tools:
        kwargs.update(tools=TOOLS, tool_choice="auto")
    return client.chat.completions.create(**kwargs)


def run_agent(history):
    """history: list of user/assistant messages. Returns (answer, tools_used)."""
    messages = [{"role": "system", "content": SYSTEM}] + history
    tools_used = []

    for _ in range(5):
        try:
            resp = call_llm(messages)
        except BadRequestError:
            # Model produced a malformed tool call: retry once, then fall back to plain chat
            try:
                resp = call_llm(messages)
            except BadRequestError:
                resp = call_llm(messages, use_tools=False)

        msg = resp.choices[0].message

        if not msg.tool_calls:
            return msg.content, tools_used

        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ],
        })
        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            result = run_tool(tc.function.name, args)
            label = args.get("query") or args.get("expression") or ""
            tools_used.append(f"{tc.function.name}: {label}".rstrip(": "))
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

    return "The agent could not reach an answer. Please rephrase your question.", tools_used