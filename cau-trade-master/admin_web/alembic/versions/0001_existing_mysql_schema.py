"""baseline existing MySQL schema

Revision ID: 0001_existing_mysql_schema
Revises:
Create Date: 2026-06-18 00:00:00
"""

revision = "0001_existing_mysql_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The classroom database is created by database/mysql/schema.sql first.
    # Alembic starts from this baseline so later schema changes can be tracked.
    pass


def downgrade() -> None:
    pass
