def calculate_task_score(slider1: float = 50.0, slider2: float = 50.0, slider3: float = 50.0) -> float:
    
    average_score = (slider1 + slider2 + slider3) / 3
    
    return round(average_score, 3)