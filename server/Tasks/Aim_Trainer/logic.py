import time
import random

class AimTrainerGame:
    def __init__(self, grid_size=5, duration=45):
        self.grid_size = grid_size
        self.duration = duration
        self.reset()

    def reset(self):
        """Resets the game state to initial values."""
        self.target_count = 0
        self.start_time = 0
        self.end_time = 0
        self.is_active = False
        self.is_game_over = False
        self.current_target = self._generate_random_pos()
    
    def start(self):
        """Starts the timer and activates the game."""
        self.reset()
        self.is_active = True
        self.start_time = time.time()

    def register_hit(self):
        """
        Records a hit. Checks if time has expired.
        """
        if not self.is_active:
            return

        # Check if time is up before counting the hit
        elapsed = time.time() - self.start_time
        if elapsed >= self.duration:
            self.end_game()
            return

        self.target_count += 1
        self._move_target()

    def check_time(self):
        """
        Passive check to see if time ran out (can be called by UI).
        """
        if self.is_active:
            elapsed = time.time() - self.start_time
            if elapsed >= self.duration:
                self.end_game()

    def _move_target(self):
        self.current_target = self._generate_random_pos()

    def _generate_random_pos(self):
        return (random.randint(0, self.grid_size - 1), 
                random.randint(0, self.grid_size - 1))

    def end_game(self):
        self.end_time = time.time()
        self.is_active = False
        self.is_game_over = True

    def get_score(self):
        """
        Generates a score between 60-100 based on hits within the time limit.
        """
        if not self.is_game_over:
            return 0
            
        # Calibration:
        # > 60 hits (1.3 hits/sec) = 100 Score (Excellent)
        # 0 hits = 60 Score (Base)
        # Linear scaling between 0 and 60 hits.
        
        hits = self.target_count
        
        # 40 points range (100 - 60) distributed over 60 hits
        # approx 0.66 points per hit
        points_added = (hits / 60) * 40
        
        final_score = 60 + int(points_added)
        
        # Clamp score between 60 and 100
        return max(60, min(100, final_score))

    def get_stats(self):
        """Returns stats for UI."""
        current_time = time.time() if self.is_active else self.end_time
        elapsed = max(0, current_time - self.start_time) if self.start_time > 0 else 0
        remaining = max(0, self.duration - elapsed)
        
        return {
            "targets_hit": self.target_count,
            "time_remaining": remaining,
            "total_duration": self.duration,
            "is_active": self.is_active,
            "is_over": self.is_game_over,
            "target_pos": self.current_target
        }