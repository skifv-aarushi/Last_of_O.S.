class CitizenLogic:
    @staticmethod
    def get_impact(score: float, is_approved: bool):
        """
        Logic based on Flowchart:
        - Score > 95 & Approved -> Heal 0.1%
        - Score > 95 & Rejected -> Heal 0.05%
        - Score < 95 & Approved -> Heal 0.02%
        - Score < 95 & Rejected -> Nothing
        """
        if score >= 95.0:
            if is_approved: return "HEAL", 0.10
            else: return "HEAL", 0.05
        else:
            if is_approved: return "HEAL", 0.02
            else: return "NONE", 0.0