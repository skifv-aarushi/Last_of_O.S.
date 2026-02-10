class CitizenLogic:
    @staticmethod
    def get_impact(score: float, is_approved: bool):
        """
        Flowchart Logic (Left Side):
        - Score > 95 (High Performance):
            - Approved: HEAL 0.1%
            - Rejected: HEAL 0.05% (Still heals, but less)
        - Score <= 95 (O.W.):
            - Approved: HEAL 0.02%
            - Rejected: NOTHING
        """
        if score > 95.0:
            if is_approved: return "HEAL", 0.10
            else: return "HEAL", 0.05
        else:
            if is_approved: return "HEAL", 0.02
            else: return "NONE", 0.0