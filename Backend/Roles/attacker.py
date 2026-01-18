class AttackerLogic:
    MEDIAN = 80.0 # Assumed median for logic

    @staticmethod
    def apply_infection(raw: float, choice: str) -> float:
        """ Minor +6, Major +10 """
        if choice == "MINOR": return raw + 6.0
        elif choice == "MAJOR": return raw + 10.0
        return raw

    @staticmethod
    def get_impact(final_score: float, is_approved: bool):
        """
        Logic based on Flowchart:
        - A+ (Above Median) & Approved -> DMG 0.03% (Avg from chart)
        - A+ (Above Median) & Rejected -> HEAL 0.02% (Accidental Heal)
        - A- (Below Median) & Approved -> Nothing
        - A- (Below Median) & Rejected -> Nothing
        """
        above_median = final_score > AttackerLogic.MEDIAN
        
        if is_approved:
            if above_median: return "DMG", 0.03 # Malware In
            else: return "NONE", 0.0
        else:
            if above_median: return "HEAL", 0.02 # Caught Malware
            else: return "NONE", 0.0