import time
import random

# Domain-specific word bank
ROBOTICS_AI_TERMS = [
    # AI/ML
    "Tensor", "Neural", "Gradient", "Epoch", "Sigmoid", "Perceptron", 
    "Backprop", "Bias", "Variance", "Overfit", "Dropout", "Softmax", 
    "Heuristic", "Agent", "Cluster", "Vector", "Embedding", "Token", 
    "Transformer", "Attention", "Latency", "Inference", "Dataset",
    # Robotics/Electronics
    "Actuator", "Servo", "Arduino", "Raspberry", "Micro", "Voltage", 
    "Current", "Resistor", "Capacitor", "Inductor", "Diode", "Transistor",
    "MOSFET", "Relay", "Sensor", "Lidar", "Sonar", "Encoder", "Gyro",
    "Accel", "Magnet", "Solenoid", "Circuit", "PCB", "Schematic",
    "Firmware", "Signal", "Analog", "Digital", "PWM", "UART", "I2C",
    "SPI", "Serial", "Baud", "Kinematics", "Torque", "Payload", "DOF"
]

class VerbalMemoryGame:
    def __init__(self, duration=45):
        self.duration = duration
        self.reset()

    def reset(self):
        """Resets the game state."""
        self.score = 0
        self.lives = 3 # Optional: standard verbal memory has lives, but we primarily use timer here
        self.start_time = 0
        self.end_time = 0
        self.is_active = False
        self.is_game_over = False
        
        # Word management
        self.seen_words = set()
        self.current_word = ""
        self.is_new = True # Track if the current word is actually new
        
        # Generate first word
        self._next_word()

    def start(self):
        """Starts the timer."""
        self.reset()
        self.is_active = True
        self.start_time = time.time()

    def _next_word(self):
        """
        Decides whether to show a new word or a seen word.
        Standard ratio is usually around 60% New / 40% Seen to build up the pool.
        """
        # If we have no seen words yet, we must show a new one
        if not self.seen_words:
            self._pick_new_word()
            return

        # Random chance: 40% chance to show a SEEN word
        if random.random() < 0.4:
            self.current_word = random.choice(list(self.seen_words))
            self.is_new = False
        else:
            self._pick_new_word()

    def _pick_new_word(self):
        """Picks a random word that hasn't been seen yet."""
        # Simple safeguard: if we exhaust the list (unlikely in 45s), reset seen
        available = [w for w in ROBOTICS_AI_TERMS if w not in self.seen_words]
        if not available:
            self.seen_words.clear()
            available = ROBOTICS_AI_TERMS
            
        word = random.choice(available)
        self.current_word = word
        self.seen_words.add(word)
        self.is_new = True

    def submit_answer(self, user_choice_is_new):
        """
        Process the user's answer.
        user_choice_is_new: True if user clicked 'NEW', False if 'SEEN'
        """
        if not self.is_active:
            return

        # Check Timer
        elapsed = time.time() - self.start_time
        if elapsed >= self.duration:
            self.end_game()
            return

        # Check Correctness
        if user_choice_is_new == self.is_new:
            self.score += 1
        else:
            # Optional: Deduct points or lives? 
            # For this timed version, we just don't add points (or could penalize)
            self.lives -= 1
            if self.lives <= 0:
                self.end_game()
                return

        self._next_word()

    def check_time(self):
        """Passive timer check."""
        if self.is_active:
            elapsed = time.time() - self.start_time
            if elapsed >= self.duration:
                self.end_game()

    def end_game(self):
        self.end_time = time.time()
        self.is_active = False
        self.is_game_over = True

    def get_score(self):
        """
        Returns final score.
        Max sensible score in 45s is probably ~40-50.
        Mapping to 60-100 range:
        """
        if not self.is_game_over:
            return 0
        
        # Base 60, +1 per correct answer roughly?
        # If score is 20 -> 80. If score is 40 -> 100.
        mapped_score = 60 + self.score
        return max(60, min(100, mapped_score))

    def get_stats(self):
        current_time = time.time() if self.is_active else self.end_time
        elapsed = max(0, current_time - self.start_time) if self.start_time > 0 else 0
        remaining = max(0, self.duration - elapsed)
        
        return {
            "current_word": self.current_word,
            "score": self.score,
            "lives": self.lives,
            "time_remaining": remaining,
            "total_duration": self.duration,
            "is_active": self.is_active,
            "is_over": self.is_game_over
        }