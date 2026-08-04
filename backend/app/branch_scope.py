"""
Branch-level data isolation context.

Unlike TenantContext which is automatically enforced globally via SQLAlchemy events,
BranchContext provides a thread-local store for the active branch and a helper 
`apply_branch_scope` to explicitly filter queries. 
This is because some entities (like Categories or Brands) might be tenant-wide
rather than branch-specific, or they might be shared across branches (branch_id IS NULL).
"""

from flask import g


class BranchContext:
    """Holds the active branch ID for the lifetime of a single request."""

    @staticmethod
    def set(branch_id: int | None) -> None:
        g.branch_id = branch_id

    @staticmethod
    def get() -> int | None:
        return getattr(g, "branch_id", None)

    @staticmethod
    def clear() -> None:
        g.branch_id = None


def apply_branch_scope(query, model):
    """
    Applies strict branch filtering to a SQLAlchemy query: if a BranchContext
    is set, only records whose branch_id matches it are returned. Records
    with branch_id IS NULL are NOT treated as shared -- every branch-aware
    row must belong to exactly one branch (see cleanup_orphan_branch_data.py
    for migrating pre-multi-branch legacy rows that predate this rule).
    """
    branch_id = BranchContext.get()

    if branch_id and hasattr(model, 'branch_id'):
        return query.filter(model.branch_id == branch_id)

    return query
