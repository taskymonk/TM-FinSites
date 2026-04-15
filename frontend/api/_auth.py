import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev_secret_change_in_production_64chars')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY = timedelta(hours=24)
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@finsites.in')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

def create_token(email):
    payload = {'email': email, 'exp': datetime.now(timezone.utc) + JWT_EXPIRY, 'iat': datetime.now(timezone.utc)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def check_admin(email, password):
    return email.strip().lower() == ADMIN_EMAIL.lower() and password == ADMIN_PASSWORD

def get_token_from_cookies(cookie_header):
    if not cookie_header:
        return None
    for part in cookie_header.split(';'):
        part = part.strip()
        if part.startswith('access_token='):
            return part[len('access_token='):]
    return None

def get_admin_from_request(headers):
    cookie = headers.get('Cookie', '')
    token = get_token_from_cookies(cookie)
    if not token:
        auth = headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth[7:]
    if not token:
        return None
    payload = verify_token(token)
    return payload.get('email') if payload else None
