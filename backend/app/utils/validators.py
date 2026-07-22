import re

from marshmallow import ValidationError

# Standard 15-character GSTIN format:
# 2-digit state code + 10-char PAN + 1 entity code + literal 'Z' + 1 checksum char.
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")


def validate_gstin(value):
    """
    Marshmallow-style validator: GSTIN is optional, so empty/None is fine.
    Only rejects a value that's present but doesn't match the format.
    """
    if not value:
        return
    if not GSTIN_REGEX.match(value.strip().upper()):
        raise ValidationError(
            "Invalid GSTIN format. Expected 15 characters, e.g. 27ABCDE1234F1Z5."
        )
