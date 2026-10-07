import os
import sys

# Ensure backend directory is in the Python path for Vercel Serverless environment
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(ROOT_DIR, 'backend')

for p in (ROOT_DIR, BACKEND_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app import app

# Normalizing WSGI wrapper to handle both /api/* and direct path invocations on serverless hosts
class ApiPrefixFix:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '')
        # If the platform stripped '/api', restore it so routes match @app.route('/api/...')
        if not path.startswith('/api') and path != '/':
            environ['PATH_INFO'] = '/api' + path
        return self.wsgi_app(environ, start_response)

app.wsgi_app = ApiPrefixFix(app.wsgi_app)

# Explicitly export the WSGI application instance for Vercel Python runtime
__all__ = ['app']
