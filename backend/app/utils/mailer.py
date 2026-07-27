import logging

from flask import current_app
from flask_mail import Message

from app.extensions import mail

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html_body: str) -> bool:
    """
    Sends an email via the configured SMTP server. Returns True/False instead
    of letting a misconfigured mail server (bad credentials, unreachable
    host) turn into an unhandled 500 -- callers decide how to react.
    """
    if not current_app.config.get("MAIL_SERVER"):
        logger.error("Email not sent to %s: MAIL_SERVER is not configured.", to)
        return False

    try:
        msg = Message(subject=subject, recipients=[to], html=html_body)
        mail.send(msg)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False
