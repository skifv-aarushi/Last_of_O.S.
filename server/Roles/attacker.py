class AttackerLogic:
    # The flowchart implies logic depends on if score is above/below a "Median"
    MEDIAN = 80.0 

    @staticmethod
    def apply_infection(raw: float, choice: str) -> float:
        """ 
        Flowchart 'Infect' Box:
        - Minor: +6% Score
        - Major: +10% Score
        """
        if choice == "MINOR": return raw * 1.06
        elif choice == "MAJOR": return raw * 1.10
        return raw

    @staticmethod
    def get_impact(final_score: float, is_approved: bool, infection_level: str):
        """
        Determines impact based on the two Attacker paths in the flowchart.
        """
        
        # --- PATH 1: NO INJECT (Middle Branch) ---
        # Even without injecting, an Attacker causes subtle damage if approved.
        if infection_level == "NONE":
            if final_score > 95.0:
                if is_approved: return "DMG", 0.05  # High score cover -> High damage
                else: return "DMG", 0.03            # Rejected but high score -> residual damage
            else: # O.W. (<= 95)
                if is_approved: return "DMG", 0.02
                else: return "NONE", 0.0

        # --- PATH 2: INFECT (Right Branch) ---
        else:
            # A+ = Score Above Median
            above_median = final_score > AttackerLogic.MEDIAN
            
            if is_approved:
                # Path: A+ / At+ (Above Median + Approved) -> INFECT -> DMG 0.03%
                if above_median: return "DMG", 0.03
                # Path: A- / At+ (Below Median + Approved) -> Nothing
                else: return "NONE", 0.0
            else:
                # Path: A+ / At- (Above Median + Rejected) -> HEAL -> HEAL 0.02%
                # (The Authority successfully caught the malware, system hardens)
                if above_median: return "HEAL", 0.02
                # Path: A- / At- (Below Median + Rejected) -> Nothing
                else: return "NONE", 0.0