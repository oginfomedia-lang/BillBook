"""
Plan-limit enforcement shared by branch creation (app/routes/branches.py)
and user creation (app/routes/users.py). Deliberately takes NO tenant_id
parameter -- TenantLicense/Branch/User are all TenantScopedMixin models, so
plain `.query` calls are already auto-scoped to the current request's
tenant (see app/tenant_scope.py). Only call these from inside a request
that has already run @require_auth.
"""
from app.models import Branch, User
from app.models.tenant_license import LicenseStatus, TenantLicense


def _get_active_license() -> TenantLicense | None:
    return TenantLicense.query.first()


def check_branch_limit() -> tuple[bool, str | None]:
    """Returns (allowed, error_message). error_message is None when allowed."""
    license_ = _get_active_license()
    if license_ is None or license_.plan is None:
        # No license row yet -- unrestricted until a plan is assigned.
        return True, None

    if license_.status == LicenseStatus.SUSPENDED:
        return False, "Your BillBook subscription is currently suspended. Contact support to reactivate."

    max_branches = license_.plan.max_branches
    if max_branches is None:
        return True, None  # unlimited tier

    current_count = Branch.query.filter_by(is_active=True).count()
    if current_count >= max_branches:
        return False, (
            f"You've reached your plan's branch limit ({current_count}/{max_branches}). "
            f"Upgrade your plan to add more branches."
        )
    return True, None


def check_user_limit() -> tuple[bool, str | None]:
    license_ = _get_active_license()
    if license_ is None or license_.plan is None:
        return True, None

    if license_.status == LicenseStatus.SUSPENDED:
        return False, "Your BillBook subscription is currently suspended. Contact support to reactivate."

    max_users = license_.plan.max_users
    if max_users is None:
        return True, None

    current_count = User.query.filter_by(is_active=True).count()
    if current_count >= max_users:
        return False, (
            f"You've reached your plan's user limit ({current_count}/{max_users}). "
            f"Upgrade your plan to add more users."
        )
    return True, None