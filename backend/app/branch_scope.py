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
    Applies branch filtering to a SQLAlchemy query.
    If a BranchContext is set, it filters the query to only return records
    where `branch_id` matches the context, OR `branch_id` is None (shared).
    """
    branch_id = BranchContext.get()
    
    if branch_id and hasattr(model, 'branch_id'):
        # Allow records explicitly assigned to this branch, OR records shared across branches (NULL)
        return query.filter((model.branch_id == branch_id) | (model.branch_id.is_(None)))
        
    return query
