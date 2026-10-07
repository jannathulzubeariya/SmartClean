class AppError(Exception):
    def __init__(self, code, message, status_code=400, details=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self):
        result = {
            "success": False,
            "error": {
                "code": self.code,
                "message": self.message
            }
        }
        if self.details:
            result["error"]["details"] = self.details
        return result

def make_success(data=None, message="Operation successful"):
    return {
        "success": True,
        "message": message,
        "data": data if data is not None else {}
    }

def make_error(code, message, status_code=400, details=None):
    return AppError(code, message, status_code, details)
