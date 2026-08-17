"""Minimal outgoing-mail helper - no Flask-Mail dependency, just smtplib.

Config is read from the Flask app config (populated from env vars in
app.create_app()): SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
SMTP_USE_TLS, MAIL_FROM. All optional - see send_email() for what happens
when SMTP_HOST isn't set.
"""

import logging
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)


class MailError(Exception):
    """Raised when an email genuinely fails to send (SMTP configured but
    unreachable/rejecting). Callers turn this into a clean 500 rather than
    leaking SMTP internals to the client."""


def send_email(app, to: str, subject: str, body: str) -> None:
    # Tests never hit the network - the exact message is recorded so tests
    # can pull the real verification/reset code out of it, mirroring
    # Flask-Mail's record_messages() pattern.
    if app.config.get("TESTING"):
        app.config.setdefault("MAIL_OUTBOX", []).append(
            {"to": to, "subject": subject, "body": body}
        )
        return

    host = app.config.get("SMTP_HOST")
    if not host:
        # No SMTP configured (e.g. local/dev without a mail provider) - log
        # the email instead of failing outright, so registration/
        # verification/reset all work out of the box with zero mail setup.
        logger.info("SMTP not configured; email to %s not sent.\nSubject: %s\n%s", to, subject, body)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = app.config.get("MAIL_FROM", "PlannerPro <no-reply@planerpro.local>")
    msg["To"] = to
    msg.set_content(body)

    port = app.config.get("SMTP_PORT", 587)
    username = app.config.get("SMTP_USERNAME")
    password = app.config.get("SMTP_PASSWORD")
    use_tls = app.config.get("SMTP_USE_TLS", True)

    try:
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            if use_tls:
                smtp.starttls()
            if username:
                smtp.login(username, password or "")
            smtp.send_message(msg)
    except (smtplib.SMTPException, OSError):
        logger.exception("Failed to send email to %s", to)
        raise MailError("Failed to send email")
