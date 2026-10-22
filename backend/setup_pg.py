"""
Legacy PostgreSQL Setup Script (Local Development Only)
Configures a local PostgreSQL database and application user for the legacy FastAPI backend.
Credentials are read strictly from environment variables.
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2 import sql

# Administrative connection parameters (default to standard local defaults)
ADMIN_HOST = os.getenv("LOCAL_PG_ADMIN_HOST", "localhost")
ADMIN_PORT = int(os.getenv("LOCAL_PG_ADMIN_PORT", "5432"))
ADMIN_USER = os.getenv("LOCAL_PG_ADMIN_USER", "postgres")
ADMIN_PASSWORD = os.getenv("LOCAL_PG_ADMIN_PASSWORD", "postgres")
ADMIN_DB = os.getenv("LOCAL_PG_ADMIN_DB", "postgres")

# Target database and application user
APP_DB_NAME = os.getenv("LOCAL_DB_NAME", "campuslink_local")
APP_DB_USER = os.getenv("LOCAL_DB_USER", "campuslink_dev")
APP_DB_PASSWORD = os.getenv("LOCAL_DB_PASSWORD", "local_dev_secret_change_me")


def setup_database():
    try:
        conn = psycopg2.connect(
            host=ADMIN_HOST,
            port=ADMIN_PORT,
            user=ADMIN_USER,
            password=ADMIN_PASSWORD,
            dbname=ADMIN_DB
        )
    except Exception:
        print("[ERROR] Could not connect to local PostgreSQL server. Please check your local connection settings.")
        sys.exit(1)

    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()

    try:
        cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(APP_DB_NAME)))
        print(f"[OK] Database '{APP_DB_NAME}' created.")
    except Exception as e:
        print(f"[INFO] Notice creating database '{APP_DB_NAME}': {e.__class__.__name__}")

    try:
        cursor.execute(
            sql.SQL("CREATE USER {} WITH PASSWORD %s").format(sql.Identifier(APP_DB_USER)),
            [APP_DB_PASSWORD]
        )
        print(f"[OK] User '{APP_DB_USER}' created.")
    except Exception as e:
        print(f"[INFO] Notice creating user '{APP_DB_USER}': {e.__class__.__name__}")

    try:
        cursor.execute(
            sql.SQL("GRANT ALL PRIVILEGES ON DATABASE {} TO {}").format(
                sql.Identifier(APP_DB_NAME),
                sql.Identifier(APP_DB_USER)
            )
        )
        cursor.execute(
            sql.SQL("ALTER DATABASE {} OWNER TO {}").format(
                sql.Identifier(APP_DB_NAME),
                sql.Identifier(APP_DB_USER)
            )
        )
        print(f"[OK] Privileges granted on '{APP_DB_NAME}' to '{APP_DB_USER}'.")
    except Exception as e:
        print(f"[INFO] Notice granting privileges: {e.__class__.__name__}")

    cursor.close()
    conn.close()
    print("[DONE] Local PostgreSQL setup complete.")


if __name__ == "__main__":
    setup_database()
