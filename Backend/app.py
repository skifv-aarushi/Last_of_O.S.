import streamlit as st
import requests

API = "http://127.0.0.1:8000"

st.set_page_config(layout="wide", page_title="YANTRA 2026")

# --- 1. GLOBAL HEALTH DISPLAY ---
try:
    h_res = requests.get(f"{API}/global_health")
    health_val = h_res.json().get("health", 100.0)
    st.title(f"Global System Health: {health_val:.2f}%")
    st.progress(int(health_val))
except:
    st.error("Backend Offline")

role = st.sidebar.selectbox("Role", ["Citizen", "Attacker", "Authority", "Auditor"])

# --- CITIZEN ---
if role == "Citizen":
    st.header("Citizen Task")
    c1, c2, c3 = st.columns(3)
    v1 = c1.number_input("Task Value 1", 0.0, 100.0, 80.0)
    v2 = c2.number_input("Task Value 2", 0.0, 100.0, 80.0)
    v3 = c3.number_input("Task Value 3", 0.0, 100.0, 80.0)
    if st.button("Submit Task"):
        requests.post(f"{API}/citizen/submit", json={"val1":v1, "val2":v2, "val3":v3})
        st.success("Task Sent!")

# --- ATTACKER ---
elif role == "Attacker":
    st.header("Attacker Injection")
    c1, c2, c3 = st.columns(3)
    v1 = c1.number_input("Base Val 1", 0.0, 100.0, 75.0)
    v2 = c2.number_input("Base Val 2", 0.0, 100.0, 75.0)
    v3 = c3.number_input("Base Val 3", 0.0, 100.0, 75.0)
    choice = st.radio("Injection", ["NONE", "MINOR", "MAJOR"])
    if st.button("Inject Malware"):
        requests.post(f"{API}/attacker/submit", json={"val1":v1, "val2":v2, "val3":v3, "infection_choice":choice})
        st.warning("Malware Injected!")

# --- AUTHORITY ---
elif role == "Authority":
    st.header("Authority Approval")
    my_id = st.number_input("My ID", 1, 10, 1)
    
    if st.button("Refresh Queue"): st.rerun()
    
    pend = requests.get(f"{API}/authority/pending").json()
    if not pend: st.info("No Pending Tasks")
    
    for p in pend:
        with st.expander(f"Task #{p['id']} - Score: {p['final_score']}"):
            c1, c2 = st.columns(2)
            if c1.button("Approve", key=f"a_{p['id']}"):
                r = requests.post(f"{API}/authority/decide", json={"authority_id":my_id, "cert_id":p['id'], "action":"APPROVE"})
                st.write(r.json())
            if c2.button("Reject", key=f"r_{p['id']}"):
                r = requests.post(f"{API}/authority/decide", json={"authority_id":my_id, "cert_id":p['id'], "action":"REJECT"})
                st.write(r.json())

# --- AUDITOR ---
elif role == "Auditor":
    st.header("Auditor Surveillance")
    target = st.number_input("Target Authority ID", 1)
    if st.button("BAN AUTHORITY (3 Mins)"):
        requests.post(f"{API}/auditor/ban", json={"target_authority_id":target})
        st.error(f"Authority {target} Banned!")