# Inside your Authority_main.py /decide route:

# 1. Get the infection level we saved during the Attacker's submit
infection_level = cert.get("infection_type", "NONE") 
final_score = cert.get("final_score", 0)
is_approved = (data.action == "APPROVE")

# 2. Run the Attacker Logic
if cert.get("role") == "ATTACKER":
    type_, val_ = AttackerLogic.get_impact(
        final_score, 
        is_approved, 
        infection_level
    )