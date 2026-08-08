import math

def geocode_address(address_str: str):
    """
    Geocodes a place name/address string to (latitude, longitude).
    If the string is formatted as latitude, longitude (e.g. '30.044, 31.235'),
    it parses it directly.
    """
    # Try parsing directly as lat, lon coordinates first
    try:
        parts = address_str.split(',')
        if len(parts) == 2:
            lat = float(parts[0].strip())
            lon = float(parts[1].strip())
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return lat, lon
    except ValueError:
        pass

    # Fallback to geocoding using Nominatim
    try:
        from geopy.geocoders import Nominatim
        from geopy.exc import GeopyError
        # Using a distinct user agent to respect Nominatim policy
        geolocator = Nominatim(user_agent="ceresflow_explorer_agent_2026")
        location = geolocator.geocode(address_str, timeout=10)
        if location:
            return location.latitude, location.longitude
    except (ImportError, Exception) as e:
        print(f"Geocoding service/library unavailable: {e}")
    
    return None

def get_bbox_from_point(lat: float, lon: float, radius_km: float):
    """
    Computes a bounding box (min_lat, min_lon, max_lat, max_lon)
    given a center point and buffer radius in kilometers.
    Uses precise ellipsoidal approximation.
    """
    # 1 degree of latitude is approximately 111.132 km
    lat_buffer = radius_km / 111.132
    
    # 1 degree of longitude depends on latitude: 111.320 * cos(lat) km
    lat_rad = math.radians(lat)
    cos_lat = math.cos(lat_rad)
    if cos_lat > 0.001:
        lon_buffer = radius_km / (111.320 * cos_lat)
    else:
        lon_buffer = 360.0  # Near the poles
        
    min_lat = max(lat - lat_buffer, -90.0)
    max_lat = min(lat + lat_buffer, 90.0)
    
    # Adjust for wrapping at the anti-meridian
    min_lon = lon - lon_buffer
    max_lon = lon + lon_buffer
    if min_lon < -180:
        min_lon += 360
    if max_lon > 180:
        max_lon -= 360
        
    return {
        "min_lat": min_lat,
        "min_lon": min_lon,
        "max_lat": max_lat,
        "max_lon": max_lon,
        "center_lat": lat,
        "center_lon": lon
    }

def get_utm_zone(lat: float, lon: float) -> str:
    """
    Determines the correct EPSG code and UTM zone code for local metric coordinate systems.
    """
    # UTM zones are 6 degrees wide, numbered 1-60 starting at 180W
    zone_num = int((lon + 180) / 6) + 1
    
    # Hemispheres
    hemi = "N" if lat >= 0 else "S"
    
    # EPSG prefix (32600 for north, 32700 for south)
    epsg_prefix = 32600 if lat >= 0 else 32700
    epsg_code = epsg_prefix + zone_num
    
    return {
        "zone_name": f"{zone_num}{hemi}",
        "epsg": f"EPSG:{epsg_code}"
    }
