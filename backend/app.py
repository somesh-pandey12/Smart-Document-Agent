import streamlit as st
from rag import add_pdf
from agent import run_agent

st.set_page_config(page_title="Smart Document Agent", page_icon="🤖")
st.title("🤖 Smart Document Agent")

with st.sidebar:
    st.header("📄 Documents")
    files = st.file_uploader("PDF upload karo", type="pdf", accept_multiple_files=True)
    if st.button("Process karo") and files:
        for f in files:
            n = add_pdf(f, f.name)
            st.success(f"{f.name}: {n} chunks save hue")

if "messages" not in st.session_state:
    st.session_state.messages = []

for m in st.session_state.messages:
    with st.chat_message(m["role"]):
        st.write(m["content"])

if prompt := st.chat_input("Document ke baare mein kuch poochho..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.write(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Soch raha hu..."):
            answer, tools = run_agent(st.session_state.messages)
        st.write(answer)
        if tools:
            with st.expander("🔧 Agent ne ye tools use kiye"):
                for t in tools:
                    st.code(t)

    st.session_state.messages.append({"role": "assistant", "content": answer})