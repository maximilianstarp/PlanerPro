"""add email verification and password reset

Revision ID: 55479c865290
Revises: dc3c2858ea28
Create Date: 2026-08-17 23:45:09.869820

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '55479c865290'
down_revision = 'dc3c2858ea28'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('verification_code',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('purpose', sa.String(length=20), nullable=False),
    sa.Column('code_hash', sa.String(length=64), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('consumed_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('verification_code', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_verification_code_user_id'), ['user_id'], unique=False)

    # `email` is added nullable first and backfilled below, then tightened to
    # NOT NULL + unique - a straight NOT NULL add would fail against any
    # database that already has rows (e.g. the seeded demo account) since
    # they have nothing to put in a brand-new required column.
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('email', sa.String(length=255), nullable=True))
        batch_op.add_column(
            sa.Column(
                'email_verified', sa.Boolean(), nullable=False, server_default=sa.false()
            )
        )
        batch_op.add_column(sa.Column('pending_email', sa.String(length=255), nullable=True))

    # Placeholder, clearly-invalid address (example.invalid is reserved by
    # RFC 2606) for any pre-existing user - they'll see it as unverified in
    # Settings and can set a real one there.
    op.execute("UPDATE \"user\" SET email = username || '@example.invalid' WHERE email IS NULL")

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('email', existing_type=sa.String(length=255), nullable=False)
        batch_op.create_unique_constraint('uq_user_email', ['email'])


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_email', type_='unique')
        batch_op.drop_column('pending_email')
        batch_op.drop_column('email_verified')
        batch_op.drop_column('email')

    with op.batch_alter_table('verification_code', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_verification_code_user_id'))

    op.drop_table('verification_code')
