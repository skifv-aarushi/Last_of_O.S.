import time
import random

class VisualMemoryGame:
    def __init__(self, duration=45):
        self.duration = duration
        self.reset()

    def reset(self):
        """Resets the game to Level 1."""
        self.start_time = 0
        self.end_time = 0
        self.is_active = False
        self.is_game_over = False
        
        # Level Progression
        self.level = 1
        self.lives = 3
        self.grid_size = 3
        self.num_targets = 3
        
        # Turn State
        self.phase = "IDLE" # IDLE, WATCHING, PLAYING
        self.targets = set()     # The tiles to memorize {(r,c), ...}
        self.clicked = set()     # Tiles user has clicked correctly
        self.wrong_clicks = set() # Tiles user clicked incorrectly
        
    def start(self):
        """Starts the main timer."""
        self.reset()
        self.is_active = True
        self.start_time = time.time()
        self.start_level()

    def start_level(self):
        """Generates a new pattern for the current level."""
        # Adjust difficulty based on level
        # Every 3 levels, increase grid size (up to max 5x5 or 6x6)
        # Increase targets progressively
        
        self.grid_size = 3 + (self.level // 3)
        self.grid_size = min(self.grid_size, 6) # Cap at 6x6
        
        base_targets = 2
        self.num_targets = base_targets + self.level
        
        # Generate random unique targets
        self.targets = set()
        while len(self.targets) < self.num_targets:
            r = random.randint(0, self.grid_size - 1)
            c = random.randint(0, self.grid_size - 1)
            self.targets.add((r, c))
            
        self.clicked = set()
        self.wrong_clicks = set()
        self.phase = "WATCHING"

    def stop_watching(self):
        """Transition from Watching to Playing phase."""
        self.phase = "PLAYING"

    def handle_tile_click(self, r, c):
        """
        Process a user click on a tile.
        Returns True if the level is complete, False otherwise.
        """
        if not self.is_active or self.phase != "PLAYING":
            return False

        # Check Timer
        elapsed = time.time() - self.start_time
        if elapsed >= self.duration:
            self.end_game()
            return False

        coord = (r, c)
        
        # If already clicked, ignore
        if coord in self.clicked or coord in self.wrong_clicks:
            return False

        if coord in self.targets:
            # Correct Click
            self.clicked.add(coord)
            # Check Level Completion
            if len(self.clicked) == len(self.targets):
                self.level += 1
                self.start_level() # Immediately start next level logic
                return True # Signal UI that level changed (to trigger watch phase)
        else:
            # Wrong Click
            self.wrong_clicks.add(coord)
            self.lives -= 1
            if self.lives <= 0:
                self.end_game()
        
        return False

    def check_time(self):
        if self.is_active:
            elapsed = time.time() - self.start_time
            if elapsed >= self.duration:
                self.end_game()

    def end_game(self):
        self.end_time = time.time()
        self.is_active = False
        self.is_game_over = True
        self.phase = "IDLE"

    def get_score(self):
        """
        Score based on Level reached.
        Level 10 is considered very good.
        Base 60 + (Level * 3).
        """
        if not self.is_game_over:
            return 0
        
        raw_score = 60 + (self.level * 4)
        return max(60, min(100, raw_score))

    def get_stats(self):
        current_time = time.time() if self.is_active else self.end_time
        elapsed = max(0, current_time - self.start_time) if self.start_time > 0 else 0
        remaining = max(0, self.duration - elapsed)
        
        return {
            "level": self.level,
            "lives": self.lives,
            "grid_size": self.grid_size,
            "phase": self.phase,
            "targets": self.targets,
            "clicked": self.clicked,
            "wrong": self.wrong_clicks,
            "time_remaining": remaining,
            "total_duration": self.duration,
            "is_active": self.is_active,
            "is_over": self.is_game_over
        }