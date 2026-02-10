import time
import random
import difflib

PARAGRAPHS = [
    "The neural interface requires a precise calibration of voltage to ensure the synaptic gap is bridged without causing a cascade failure. If the signal to noise ratio drops below the threshold, the packet loss will result in fragmented memories and corrupted data streams.",
    "Quantum entanglement allows for instantaneous communication across vast distances, but the decoherence inherent in the system introduces a margin of error that must be accounted for by the error correction algorithms. The qubit stability is paramount for the integrity of the transmission.",
    "In the legacy systems of the Old World, binary code was the standard for all digital logic. However, the new trinary processors introduce a third state of 'maybe', allowing for fuzzy logic computations that mimic human intuition far better than the rigid zero and one structures of the past.",
    "Firewall penetration testing involves a systematic analysis of network vulnerabilities. By injecting malformed packets into the input stream, the security analyst can determine if the buffer overflow protection is active and if the intrusion detection system is properly configured to flag anomalies.",
    "Machine learning models thrive on large datasets, but the quality of the data is often more important than the quantity. Garbage in results in garbage out, necessitating a rigorous preprocessing pipeline that cleanses, normalizes, and vectorizes the raw information before it enters the training loop."
]

class TypingTestGame:
    def __init__(self, duration=45):
        self.duration = duration
        self.reset()

    def reset(self):
        """Resets the game state."""
        self.start_time = 0
        self.end_time = 0
        self.is_active = False
        self.is_game_over = False
        self.target_text = ""
        self.user_text = ""
        self.final_wpm = 0
        self.final_accuracy = 0
        self.final_score = 0

    def start(self):
        """Starts the timer and selects a paragraph."""
        self.reset()
        self.is_active = True
        self.start_time = time.time()
        self.target_text = random.choice(PARAGRAPHS)

    def submit_test(self, user_input):
        """
        Calculates results based on the user's input.
        """
        self.end_time = time.time()
        self.user_text = user_input
        self.is_active = False
        self.is_game_over = True
        
        self._calculate_metrics()

    def _calculate_metrics(self):
        # We calculate WPM based on the full duration (45s) to standardize speed
        time_minutes = self.duration / 60.0
        
        # Accuracy Calculation (Sequence Matching)
        matcher = difflib.SequenceMatcher(None, self.target_text, self.user_text)
        matches = sum(triple[-1] for triple in matcher.get_matching_blocks())
        
        total_chars_typed = len(self.user_text)
        
        if total_chars_typed == 0:
            self.final_accuracy = 0.0
            self.final_wpm = 0
        else:
            self.final_accuracy = (matches / len(self.target_text)) * 100
            # Standard WPM = (Characters / 5) / Minutes
            self.final_wpm = (total_chars_typed / 5) / time_minutes

    def get_score(self):
        if not self.is_game_over:
            return 0
        
        # Scoring Logic:
        # Base 60 (for participation)
        # Max additional 40 points based on speed & accuracy
        # Target Speed: 80 WPM gets max points
        
        wpm_score = max(0, min(40, (self.final_wpm - 20) * (40/60)))
        
        # Accuracy acts as a multiplier. If 50% accurate, you only get 50% of your speed points.
        adjusted_points = wpm_score * (self.final_accuracy / 100)
        
        final = 60 + adjusted_points
        return int(max(60, min(100, final)))

    def get_stats(self):
        current_time = time.time() if self.is_active else self.end_time
        elapsed = max(0, current_time - self.start_time) if self.start_time > 0 else 0
        remaining = max(0, self.duration - elapsed)
        
        return {
            "target_text": self.target_text,
            "user_text": self.user_text,
            "wpm": self.final_wpm,
            "accuracy": self.final_accuracy,
            "time_remaining": remaining,
            "total_duration": self.duration,
            "is_active": self.is_active,
            "is_over": self.is_game_over
        }