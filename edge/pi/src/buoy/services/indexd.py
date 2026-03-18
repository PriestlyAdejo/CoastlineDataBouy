from __future__ import annotations

from buoy.config import load_settings
from buoy.index.sqlite_index import init_db, open_db
from buoy.logging import setup_logging


def main() -> None:
    settings = load_settings()
    logger = setup_logging("buoy.indexd")
    db_path = settings.paths.data_dir / "index" / "buoy.sqlite"
    logger.info("opening index db path=%s", db_path)
    con = open_db(db_path)
    init_db(con)
    logger.info("index ready")


if __name__ == "__main__":
    main()

