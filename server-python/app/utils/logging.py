import sys

from loguru import logger


def setup_logging():
    try:
        from app.config import config

        log_level = config.get("log_level", "INFO")
        json_logs = config.get("json_logs", False)
    except ImportError:
        log_level = "INFO"
        json_logs = False

    logger.remove()

    if json_logs:
        logger.add(
            sys.stdout,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{line} | {message}",
            level=log_level,
            serialize=True,
        )
    else:
        logger.add(
            sys.stdout,
            format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>",
            level=log_level,
            colorize=True,
        )

    def except_hook(exc_type, exc_value, exc_tb):
        logger.opt(exception=(exc_type, exc_value, exc_tb)).critical("Unhandled exception")

    sys.excepthook = except_hook

    return logger
