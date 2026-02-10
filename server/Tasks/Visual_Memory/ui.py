import streamlit as st
import time
import math
import streamlit.components.v1 as components

# --- IMPORT LOGIC ---
# Relative import for package compatibility
from .logic import VisualMemoryGame

# --- Page Setup ---
try:
    st.set_page_config(page_title="Task 3: Visual Memory", page_icon="🧩")
except:
    pass

# --- Custom Styles ---
st.markdown("""
<style>
    div[data-testid="stVerticalBlock"] > div[style*="flex-direction: column;"] > div[data-testid="stVerticalBlock"] {
        gap: 0.5rem;
    }
    button {
        height: auto !important;
        padding-top: 1rem !important;
        padding-bottom: 1rem !important;
    }
    div[data-testid="stFormSubmitButton"] {
        display: none !important;
    }
</style>
""", unsafe_allow_html=True)

# --- Custom Component for Live Timer ---
def show_live_timer(seconds_remaining):
    initial_display = math.ceil(seconds_remaining)
    timer_html = f"""
        <div style="
            font-family: 'Source Sans Pro', sans-serif;
            font-size: 3rem;
            font-weight: 700;
            color: #FAFAFA;
            margin-bottom: 0.5rem;
            text-align: center;
        ">
            ⏱️ <span id="time_display">{initial_display}</span>s
        </div>
        <script>
            let timeLeft = {seconds_remaining};
            const display = document.getElementById("time_display");
            const timer = setInterval(function() {{
                timeLeft -= 0.1;
                if (timeLeft <= 0) {{
                    display.innerHTML = "0";
                    clearInterval(timer);
                    // Trigger update via any button click if timer hits 0 naturally
                    const allBtns = window.parent.document.querySelectorAll('button');
                    if (allBtns.length > 0) allBtns[0].click();
                }} else {{
                    display.innerHTML = Math.ceil(timeLeft);
                }}
            }}, 100);
        </script>
    """
    components.html(timer_html, height=70)

# --- Helper Functions ---
def get_game_instance():
    if 'visual_game' not in st.session_state:
        st.session_state.visual_game = VisualMemoryGame(duration=45)
    return st.session_state.visual_game

def handle_tile_click(r, c):
    game = get_game_instance()
    level_complete = game.handle_tile_click(r, c)
    if level_complete:
        st.rerun() # Rerun immediately to start the "Watching" phase of next level

def restart_game():
    game = get_game_instance()
    game.start()

# --- Main Runner ---
def run():
    st.subheader("Task 3: Machine Learning (Visual Memory) 🧩")
    
    game = get_game_instance()
    game.check_time()
    stats = game.get_stats()

    # 1. Start Screen
    if not stats['is_active'] and not stats['is_over']:
        st.markdown("### Mission Briefing")
        st.info("Protocol: Memorize the white pattern. Replicate it when the tiles reset.")
        if st.button("Start Machine Learning", type="primary", use_container_width=True):
            restart_game()
            st.rerun()
        return None

    # 2. Gameplay Screen
    elif stats['is_active']:
        
        # Top Bar Info
        show_live_timer(stats['time_remaining'])
        
        c1, c2 = st.columns(2)
        c1.markdown(f"<h4 style='text-align:center'>Level: {stats['level']}</h4>", unsafe_allow_html=True)
        c2.markdown(f"<h4 style='text-align:center'>Lives: {'❤️' * stats['lives']}</h4>", unsafe_allow_html=True)
        
        # --- PHASE HANDLING ---
        
        if stats['phase'] == "WATCHING":
            st.warning("👀 MEMORIZE THE PATTERN...")
            
            # Draw Grid - SHOWING TARGETS
            grid_size = stats['grid_size']
            targets = stats['targets']
            
            with st.container(border=True):
                for r in range(grid_size):
                    cols = st.columns(grid_size)
                    for c in range(grid_size):
                        if (r, c) in targets:
                            cols[c].button("⬜", key=f"watch_{r}_{c}_{stats['level']}", type="primary", disabled=True, use_container_width=True)
                        else:
                            cols[c].button("⬛", key=f"watch_{r}_{c}_{stats['level']}", disabled=True, use_container_width=True)
            
            # Automatic Transition
            time.sleep(1.5)
            game.stop_watching()
            st.rerun()

        elif stats['phase'] == "PLAYING":
            st.info("👆 REPLICATE THE PATTERN")
            
            # Draw Grid - INTERACTIVE
            grid_size = stats['grid_size']
            clicked = stats['clicked']
            wrong = stats['wrong']
            
            with st.container(border=True):
                for r in range(grid_size):
                    cols = st.columns(grid_size)
                    for c in range(grid_size):
                        coord = (r, c)
                        
                        # Determine Button State
                        if coord in clicked:
                            # Correctly found
                            cols[c].button("✅", key=f"play_{r}_{c}_{stats['level']}", type="primary", disabled=True, use_container_width=True)
                        elif coord in wrong:
                            # Mistake
                            cols[c].button("❌", key=f"play_{r}_{c}_{stats['level']}", disabled=True, use_container_width=True)
                        else:
                            # Unknown / Clickable
                            cols[c].button(
                                "⬛", 
                                key=f"btn_{r}_{c}_{stats['level']}", 
                                on_click=handle_tile_click,
                                args=(r, c),
                                use_container_width=True
                            )
        return None

    # 3. Game Over Screen
    elif stats['is_over']:
        score = game.get_score()
        
        if stats['lives'] <= 0:
            st.error("SYSTEM FAILURE: Pattern Mismatch.")
        else:
            st.success("⏱️ TIME LIMIT REACHED")
            
        st.markdown("---")
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Max Level Reached", stats['level'])
        with col2:
            st.metric("Mission Score", score)

        st.markdown(f"**Status:** {'Authority Approved' if score > 75 else 'Training Required'}")
        
        # INTEGRATION: Return Score to Main App
        if st.button("Submit Report", type="primary", use_container_width=True):
            del st.session_state.visual_game
            return float(score)
            
        return None

if __name__ == "__main__":
    run()