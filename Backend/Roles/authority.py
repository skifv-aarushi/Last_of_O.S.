from sqlalchemy.orm import Session
from models import AuthorityBan
from datetime import datetime

class AuthorityLogic:
    @staticmethod
    def check_ban(db: Session, auth_id: int) -> bool:
        ban = db.query(AuthorityBan).filter_by(authority_id=auth_id).first()
        if ban and ban.banned_until > datetime.utcnow():
            return True
        return False