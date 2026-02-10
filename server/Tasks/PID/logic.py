import random
import time
import numpy as np

class PIDGame:
    def __init__(self, duration=45):
        self.session_duration = duration
        self.reset_session()

    def reset_session(self):
        """Resets the session."""
        self.start_time = 0
        self.is_active = False
        self.round_errors = []
        
        # Session-wide difficulty baselines
        self.fixed_gravity = random.uniform(8.0, 18.0) 
        self.engine_lag = random.uniform(0.1, 0.4)
        self.current_env = None

    def start_session(self):
        self.reset_session()
        self.is_active = True
        self.start_time = time.time()
        self.generate_next_problem()

    def generate_next_problem(self):
        """Generates a brutal environment."""
        self.current_env = {
            "gravity": self.fixed_gravity,
            "wind": random.uniform(-30.0, 30.0),
            "mass": random.uniform(2.0, 12.0),
            "air_density": random.uniform(0.7, 1.6),
            "sensor_noise": random.uniform(0.5, 3.5),
            "turbulence": random.uniform(5.0, 15.0),
            "target_height": random.uniform(30, 90),
            "start_height": 0.0
        }

    def run_simulation(self, kp, ki, kd):
        """Simulates flight with complex physics."""
        if not self.current_env:
            return 0

        dt = 0.05
        steps = int(10.0 / dt) 
        
        env = self.current_env
        y = env['start_height']
        velocity = 0.0
        integral = 0.0
        prev_error = 0.0
        battery = 1.0 
        
        lag_steps = int(self.engine_lag / dt)
        control_buffer = [0.0] * (lag_steps + 1)

        total_error = 0.0

        for s in range(steps):
            # Noise
            noise = np.random.uniform(-env['sensor_noise'], env['sensor_noise'])
            measured_y = y + noise
            
            # PID
            error = env['target_height'] - measured_y
            integral += error * dt
            derivative = (error - prev_error) / dt
            
            raw_signal = (kp * error) + (ki * integral) + (kd * derivative)
            
            # Lag
            control_buffer.append(raw_signal)
            delayed_signal = control_buffer.pop(0)
            
            # Battery Drain
            battery -= 0.0005 
            effective_thrust = delayed_signal * battery
            
            # Turbulence
            gust = 0.0
            if random.random() < 0.1: 
                gust = np.random.uniform(-env['turbulence'], env['turbulence'])

            # Physics
            wind_force = env['wind'] * env['air_density']
            weight = env['mass'] * env['gravity']
            
            net_force = effective_thrust + wind_force + gust - weight
            
            acceleration = net_force / env['mass']
            velocity += acceleration * dt
            y += velocity * dt
            
            if y < 0: 
                y = 0
                velocity = 0
            
            true_error = env['target_height'] - y
            total_error += abs(true_error)
            prev_error = error

        avg_error = total_error / steps
        return avg_error

    def submit_round(self, avg_error):
        self.round_errors.append(avg_error)
        # CHANGED: Limit is now 3 rounds
        if len(self.round_errors) < 3:
            self.generate_next_problem()

    def get_final_score(self):
        """
        Scoring for 3 Rounds:
        - Base: 60
        - Bonus Pool: 40 points
        - Points per round: ~13.33
        """
        rounds_completed = len(self.round_errors)
        if rounds_completed == 0:
            return 0
            
        total_round_points = 0
        points_per_round = 40.0 / 3.0  # ~13.33
        
        for err in self.round_errors:
            if err <= 4.0: score = 1.0
            elif err >= 80.0: score = 0.0
            else:
                score = 1.0 - ((err - 4.0) / 76.0)
            
            total_round_points += (points_per_round * score)
            
        final_score = 60 + total_round_points
        return int(min(100, final_score))

    def get_time_remaining(self):
        if not self.is_active:
            return 0
        elapsed = time.time() - self.start_time
        return max(0, self.session_duration - elapsed)