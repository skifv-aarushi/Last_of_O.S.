from sqlalchemy.orm import Session
from models import AuthorityBan
from datetime import datetime, timedelta

class AuditorLogic:
    @staticmethod
    def ban_authority(db: Session, auth_id: int):
        """ Applies 3 min cooldown """
        until = datetime.utcnow() + timedelta(minutes=3)
        ban = db.query(AuthorityBan).filter_by(authority_id=auth_id).first()
        if not ban:
            ban = AuthorityBan(authority_id=auth_id)
            db.add(ban)
        ban.banned_until = until
        db.commit()
        return until