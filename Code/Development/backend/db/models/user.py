# auth scaffolding — do not use in this build
from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import EmailStr


class User(Document):
    username: str
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    created_at: datetime = datetime.utcnow

    class Settings:
        name = "users"
