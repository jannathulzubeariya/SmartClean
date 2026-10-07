def format_size(bytes_val):
    """Convert bytes to a human-readable string (e.g., '14.2 MB')."""
    if bytes_val is None:
        return "0 B"
    try:
        bytes_val = float(bytes_val)
    except (ValueError, TypeError):
        return "0 B"
    
    if bytes_val < 0:
        return "0 B"
    if bytes_val == 0:
        return "0 B"
        
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    i = 0
    while bytes_val >= 1024 and i < len(units) - 1:
        bytes_val /= 1024.0
        i += 1
        
    if i == 0:
        return f"{int(bytes_val)} B"
    elif bytes_val >= 100:
        return f"{bytes_val:.1f} {units[i]}"
    else:
        return f"{bytes_val:.2f} {units[i]}"

def parse_size(size_str):
    """Parse size string like '10 MB' into bytes."""
    if not size_str:
        return 0
    parts = size_str.strip().split()
    if not parts:
        return 0
    try:
        val = float(parts[0])
    except ValueError:
        return 0
    if len(parts) == 1:
        return int(val)
    unit = parts[1].upper()
    multipliers = {
        "B": 1,
        "KB": 1024,
        "MB": 1024**2,
        "GB": 1024**3,
        "TB": 1024**4
    }
    return int(val * multipliers.get(unit, 1))
