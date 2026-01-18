class TaskLogic:
    @staticmethod
    def calculate_average(v1: float, v2: float, v3: float) -> float:
        """
        Takes 3 floats and returns the average rounded to 3 decimals.
        """
        avg = (v1 + v2 + v3) / 3.0
        return round(avg, 3)