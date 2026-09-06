"""initial_production_schema

Revision ID: 0001_initial_production_schema
Revises:
Create Date: 2026-09-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_initial_production_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=True, server_default='Viewer'),
        sa.Column('active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_name'), 'users', ['name'], unique=False)

    # 2. cows
    op.create_table(
        'cows',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('cow_number', sa.String(), nullable=False),
        sa.Column('cow_name', sa.String(), nullable=True),
        sa.Column('breed', sa.String(), nullable=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('photo', sa.String(), nullable=True),
        sa.Column('qr_code', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('calf_type', sa.String(), nullable=True),
        sa.Column('condition', sa.String(), nullable=True),
        sa.Column('purchase_price', sa.Float(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_cows_id'), 'cows', ['id'], unique=False)
    op.create_index(op.f('ix_cows_cow_number'), 'cows', ['cow_number'], unique=True)
    op.create_index(op.f('ix_cows_cow_name'), 'cows', ['cow_name'], unique=False)

    # 3. cow_status_history
    op.create_table(
        'cow_status_history',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('cow_id', sa.Integer(), sa.ForeignKey('cows.id', ondelete='CASCADE'), nullable=False),
        sa.Column('condition', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('calf_type', sa.String(), nullable=True),
        sa.Column('change_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_cow_status_history_id'), 'cow_status_history', ['id'], unique=False)
    op.create_index(op.f('ix_cow_status_history_cow_id'), 'cow_status_history', ['cow_id'], unique=False)
    op.create_index(op.f('ix_cow_status_history_change_date'), 'cow_status_history', ['change_date'], unique=False)

    # 4. cow_type_options
    op.create_table(
        'cow_type_options',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_cow_type_options_id'), 'cow_type_options', ['id'], unique=False)
    op.create_index(op.f('ix_cow_type_options_name'), 'cow_type_options', ['name'], unique=True)

    # 5. members
    op.create_table(
        'members',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('name2', sa.String(), nullable=True),
        sa.Column('mobile', sa.String(), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('family_members', sa.Integer(), server_default='1', nullable=True),
        sa.Column('milk_preference', sa.String(), server_default='Both', nullable=True),
        sa.Column('active', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('photo', sa.String(), nullable=True),
        sa.Column('photo2', sa.String(), nullable=True),
        sa.Column('member_number', sa.Integer(), nullable=True),
        sa.Column('cow_id', sa.Integer(), sa.ForeignKey('cows.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_members_id'), 'members', ['id'], unique=False)
    op.create_index(op.f('ix_members_name'), 'members', ['name'], unique=False)
    op.create_index(op.f('ix_members_name2'), 'members', ['name2'], unique=False)
    op.create_index(op.f('ix_members_mobile'), 'members', ['mobile'], unique=True)
    op.create_index(op.f('ix_members_member_number'), 'members', ['member_number'], unique=True)

    # 6. member_cows
    op.create_table(
        'member_cows',
        sa.Column('member_id', sa.Integer(), sa.ForeignKey('members.id', ondelete='CASCADE'), primary_key=True, nullable=False),
        sa.Column('cow_id', sa.Integer(), sa.ForeignKey('cows.id', ondelete='CASCADE'), primary_key=True, nullable=False),
    )

    # 7. milk_entries
    op.create_table(
        'milk_entries',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('cow_id', sa.Integer(), sa.ForeignKey('cows.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('shift', sa.String(), nullable=False),
        sa.Column('milk_qty', sa.Float(), nullable=False),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('cow_id', 'date', 'shift', name='uix_milk_entries_cow_date_shift')
    )
    op.create_index(op.f('ix_milk_entries_id'), 'milk_entries', ['id'], unique=False)
    op.create_index(op.f('ix_milk_entries_date'), 'milk_entries', ['date'], unique=False)

    # 8. daily_distribution
    op.create_table(
        'daily_distribution',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('member_id', sa.Integer(), sa.ForeignKey('members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('shift', sa.String(), nullable=False),
        sa.Column('milk_qty', sa.Float(), nullable=False),
        sa.Column('received', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('received_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('received_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), sa.ForeignKey('members.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.UniqueConstraint('member_id', 'date', 'shift', name='uix_daily_distribution_member_date_shift')
    )
    op.create_index(op.f('ix_daily_distribution_id'), 'daily_distribution', ['id'], unique=False)
    op.create_index(op.f('ix_daily_distribution_date'), 'daily_distribution', ['date'], unique=False)

    # 9. settings
    op.create_table(
        'settings',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('morning_gowal_milk', sa.Float(), server_default='2.0', nullable=True),
        sa.Column('evening_gowal_milk', sa.Float(), server_default='2.0', nullable=True),
        sa.Column('morning_other_milk', sa.Float(), server_default='0.0', nullable=True),
        sa.Column('evening_other_milk', sa.Float(), server_default='0.0', nullable=True),
        sa.Column('unit', sa.String(), server_default='Liter', nullable=True),
        sa.Column('member_mode', sa.String(), server_default='Automatic', nullable=True),
        sa.Column('logo', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_settings_id'), 'settings', ['id'], unique=False)

    # 10. activity_logs
    op.create_table(
        'activity_logs',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('user', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('module', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_activity_logs_id'), 'activity_logs', ['id'], unique=False)

    # 11. materials
    op.create_table(
        'materials',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('item_name', sa.String(), nullable=False),
        sa.Column('quantity', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('unit', sa.String(), server_default='નંગ', nullable=False),
        sa.Column('price_per_unit', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('total_price', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('purchase_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('supplier', sa.String(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_materials_id'), 'materials', ['id'], unique=False)
    op.create_index(op.f('ix_materials_item_name'), 'materials', ['item_name'], unique=False)
    op.create_index(op.f('ix_materials_purchase_date'), 'materials', ['purchase_date'], unique=False)

    # 12. material_usages
    op.create_table(
        'material_usages',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('item_name', sa.String(), nullable=False),
        sa.Column('quantity_used', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('unit', sa.String(), server_default='નંગ', nullable=False),
        sa.Column('usage_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('purpose', sa.String(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_material_usages_id'), 'material_usages', ['id'], unique=False)
    op.create_index(op.f('ix_material_usages_item_name'), 'material_usages', ['item_name'], unique=False)
    op.create_index(op.f('ix_material_usages_usage_date'), 'material_usages', ['usage_date'], unique=False)

    # 13. material_contributions
    op.create_table(
        'material_contributions',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('member_id', sa.Integer(), sa.ForeignKey('members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('contribution_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('payment_mode', sa.String(), server_default='Cash', nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_material_contributions_id'), 'material_contributions', ['id'], unique=False)
    op.create_index(op.f('ix_material_contributions_member_id'), 'material_contributions', ['member_id'], unique=False)
    op.create_index(op.f('ix_material_contributions_contribution_date'), 'material_contributions', ['contribution_date'], unique=False)

    # 14. expenses
    op.create_table(
        'expenses',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('category', sa.String(), server_default='સામાન્ય', nullable=True),
        sa.Column('quantity', sa.Float(), server_default='1.0', nullable=True),
        sa.Column('unit', sa.String(), server_default='નંગ', nullable=True),
        sa.Column('price_per_unit', sa.Float(), server_default='0.0', nullable=True),
        sa.Column('amount', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('expense_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('month_year', sa.String(), nullable=False),
        sa.Column('payment_mode', sa.String(), server_default='Cash', nullable=True),
        sa.Column('paid_to', sa.String(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_expenses_id'), 'expenses', ['id'], unique=False)
    op.create_index(op.f('ix_expenses_title'), 'expenses', ['title'], unique=False)
    op.create_index(op.f('ix_expenses_category'), 'expenses', ['category'], unique=False)
    op.create_index(op.f('ix_expenses_month_year'), 'expenses', ['month_year'], unique=False)
    op.create_index(op.f('ix_expenses_expense_date'), 'expenses', ['expense_date'], unique=False)

    # 15. member_monthly_payments
    op.create_table(
        'member_monthly_payments',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('member_id', sa.Integer(), sa.ForeignKey('members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('month_year', sa.String(), nullable=False),
        sa.Column('calculated_share', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('amount_paid', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('status', sa.String(), server_default='Pending', nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=True),
        sa.Column('payment_mode', sa.String(), server_default='Cash', nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_member_monthly_payments_id'), 'member_monthly_payments', ['id'], unique=False)
    op.create_index(op.f('ix_member_monthly_payments_member_id'), 'member_monthly_payments', ['member_id'], unique=False)
    op.create_index(op.f('ix_member_monthly_payments_month_year'), 'member_monthly_payments', ['month_year'], unique=False)


def downgrade() -> None:
    op.drop_table('member_monthly_payments')
    op.drop_table('expenses')
    op.drop_table('material_contributions')
    op.drop_table('material_usages')
    op.drop_table('materials')
    op.drop_table('activity_logs')
    op.drop_table('settings')
    op.drop_table('daily_distribution')
    op.drop_table('milk_entries')
    op.drop_table('member_cows')
    op.drop_table('members')
    op.drop_table('cow_type_options')
    op.drop_table('cow_status_history')
    op.drop_table('cows')
    op.drop_table('users')
