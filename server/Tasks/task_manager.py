import streamlit as st
import random

# Import game modules safely
try: from .Verbal_Memory import ui as verbal_ui
except ImportError: verbal_ui = None

try: from .Visual_Memory import ui as visual_ui
except ImportError: visual_ui = None

try: from .Aim_Trainer import ui as aim_ui
except ImportError: aim_ui = None

try: from .PID import ui as pid_ui
except ImportError: pid_ui = None

try: from .Typing_Test import ui as typing_ui
except ImportError: typing_ui = None

def start_new_task():
    games_map = {
        "verbal": verbal_ui, "visual": visual_ui, "aim": aim_ui,
        "pid": pid_ui, "typing": typing_ui
    }
    available = [k for k, v in games_map.items() if v is not None]
    
    if available:
        st.session_state.current_task_name = random.choice(available)
    else:
        st.error("No games found in Tasks/ folder.")

def run_active_task():
    if 'current_task_name' not in st.session_state or not st.session_state.current_task_name:
        start_new_task()
    
    task = st.session_state.current_task_name
    
    if task == "verbal" and verbal_ui: return verbal_ui.run()
    if task == "visual" and visual_ui: return visual_ui.run()
    if task == "aim" and aim_ui: return aim_ui.run()
    if task == "pid" and pid_ui: return pid_ui.run()
    if task == "typing" and typing_ui: return typing_ui.run()
    return None