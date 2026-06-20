import ipaddress
import socket
from urllib.parse import urlparse


_PRIVATE_PREFIXES = [
    "10.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
    "192.168.",
    "127.",
    "0.",
]


def validate_final_url(url: str) -> None:
    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: no hostname.")

    if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        raise ValueError("URL resolves to a local address.")

    for prefix in _PRIVATE_PREFIXES:
        if hostname.startswith(prefix):
            raise ValueError("URL resolves to a private network address.")
