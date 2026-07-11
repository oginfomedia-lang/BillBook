# backend/app/utils/branch_decorators.py

from functools import wraps
from flask import g, request, jsonify

def require_branch_access(f):
    """
    Decorator to check if user has access to the requested branch.
    Must be used AFTER @require_auth
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = getattr(g, 'user', None)
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Super admin has access to all branches
        if user.is_super_admin:
            return f(*args, **kwargs)
        
        # Get branch_id from request
        branch_id = (
            request.args.get('branch_id', type=int) or
            request.json.get('branch_id') if request.json else None or
            request.headers.get('X-Branch-Id', type=int)
        )
        
        # If no branch_id specified, use user's default branch
        if not branch_id and user.branch_id:
            branch_id = user.branch_id
        
        if not branch_id:
            return jsonify({'error': 'Branch ID is required'}), 400
        
        # Check if user has access to this branch
        if user.branch_id != branch_id:
            return jsonify({'error': 'Access denied to this branch'}), 403
        
        # Set branch_id in g for use in other functions
        g.request_branch_id = branch_id
        
        return f(*args, **kwargs)
    
    return decorated_function


def branch_data_filter(model):
    """
    Decorator to automatically filter queries by branch.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = getattr(g, 'user', None)
            if not user:
                return jsonify({'error': 'Authentication required'}), 401
            
            # Super admin sees all branches
            if user.is_super_admin:
                return f(*args, **kwargs)
            
            # Regular user sees only their branch
            if user.branch_id and hasattr(model, 'branch_id'):
                g.branch_filter = model.branch_id == user.branch_id
            else:
                g.branch_filter = None
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator