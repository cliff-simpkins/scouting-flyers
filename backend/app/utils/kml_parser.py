"""KML parser for importing zones from Google My Maps"""
import xml.etree.ElementTree as ET
from typing import List, Dict, Tuple, Optional
import re


def parse_kml(kml_content: str) -> Tuple[List[Dict], List[str]]:
    """
    Parse KML file content and extract zones

    Args:
        kml_content: KML file content as string

    Returns:
        Tuple of (zones list, errors list)
    """
    zones = []
    errors = []

    try:
        # Parse XML
        root = ET.fromstring(kml_content)

        # Define namespace
        ns = {
            'kml': 'http://www.opengis.net/kml/2.2',
            'gx': 'http://www.google.com/kml/ext/2.2'
        }

        # Find all Placemarks (zones)
        placemarks = root.findall('.//kml:Placemark', ns)

        if not placemarks:
            errors.append("No placemarks found in KML file")
            return zones, errors

        for placemark in placemarks:
            try:
                zone_data = _parse_placemark(placemark, ns)
                if zone_data:
                    zones.append(zone_data)
                else:
                    name = placemark.find('kml:name', ns)
                    zone_name = name.text if name is not None else "Unknown"
                    errors.append(f"Failed to parse placemark: {zone_name}")
            except Exception as e:
                name = placemark.find('kml:name', ns)
                zone_name = name.text if name is not None else "Unknown"
                errors.append(f"Error parsing placemark '{zone_name}': {str(e)}")

        if not zones and not errors:
            errors.append("No valid zones found in KML file")

    except ET.ParseError as e:
        errors.append(f"Invalid KML format: {str(e)}")
    except Exception as e:
        errors.append(f"Unexpected error parsing KML: {str(e)}")

    return zones, errors


def _parse_placemark(placemark: ET.Element, ns: Dict[str, str]) -> Optional[Dict]:
    """Parse a single placemark (zone) from KML"""

    # Extract name
    name_elem = placemark.find('kml:name', ns)
    name = name_elem.text.strip() if name_elem is not None and name_elem.text else None

    if not name:
        return None

    # Extract description
    desc_elem = placemark.find('kml:description', ns)
    description = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else None

    # Extract color from Style
    color = _extract_color(placemark, ns)

    # Extract geometry (Polygon)
    geometry = _extract_polygon(placemark, ns)

    if not geometry:
        return None

    # Build zone data
    zone_data = {
        'name': name,
        'description': description,
        'geometry': geometry,
        'color': color,
        'kml_metadata': {
            'source': 'kml_import',
            'original_description': description
        }
    }

    return zone_data


def _extract_polygon(placemark: ET.Element, ns: Dict[str, str]) -> Optional[Dict]:
    """Extract polygon geometry from placemark"""

    # Try to find Polygon
    polygon = placemark.find('.//kml:Polygon', ns)

    if polygon is None:
        return None

    # Find outer boundary coordinates
    outer_boundary = polygon.find('.//kml:outerBoundaryIs/kml:LinearRing/kml:coordinates', ns)

    if outer_boundary is None or not outer_boundary.text:
        return None

    # Parse coordinates
    coordinates = _parse_coordinates(outer_boundary.text)

    if len(coordinates) < 3:  # A polygon needs at least 3 points
        return None

    # Ensure polygon is closed (first point = last point)
    if coordinates[0] != coordinates[-1]:
        coordinates.append(coordinates[0])

    # Return GeoJSON Polygon format
    return {
        'type': 'Polygon',
        'coordinates': [coordinates]  # Array of linear rings, we only use outer boundary for now
    }


def _parse_coordinates(coord_text: str) -> List[List[float]]:
    """Parse coordinate string from KML"""
    coordinates = []

    # Clean up text
    coord_text = coord_text.strip()

    # Split by whitespace or newlines
    coord_pairs = coord_text.split()

    for pair in coord_pairs:
        pair = pair.strip()
        if not pair:
            continue

        # Split by comma
        parts = pair.split(',')

        if len(parts) >= 2:
            try:
                # KML format is lon,lat,alt (we use lon,lat)
                lon = float(parts[0])
                lat = float(parts[1])
                coordinates.append([lon, lat])
            except ValueError:
                continue

    return coordinates


def _extract_color(placemark: ET.Element, ns: Dict[str, str]) -> Optional[str]:
    """Extract color from placemark style"""

    # Try to find Style/PolyStyle/color
    color_elem = placemark.find('.//kml:Style/kml:PolyStyle/kml:color', ns)

    if color_elem is None or not color_elem.text:
        # Try to find styleUrl reference
        style_url = placemark.find('kml:styleUrl', ns)
        if style_url is not None and style_url.text:
            # For now, we don't resolve style references
            # You could extend this to look up styles by ID
            return None
        return None

    # KML color format is aabbggrr (alpha, blue, green, red)
    # We want #rrggbb
    kml_color = color_elem.text.strip()

    if len(kml_color) == 8:
        # Extract rr, gg, bb
        rr = kml_color[6:8]
        gg = kml_color[4:6]
        bb = kml_color[2:4]
        return f'#{rr}{gg}{bb}'

    return None


def convert_geojson_to_wkt(geojson: Dict) -> str:
    """
    Convert GeoJSON geometry to WKT format for PostGIS

    Args:
        geojson: GeoJSON geometry dict

    Returns:
        WKT string
    """
    if geojson['type'] == 'Polygon':
        coordinates = geojson['coordinates'][0]  # Outer ring
        coord_pairs = [f"{lon} {lat}" for lon, lat in coordinates]
        wkt = f"POLYGON(({','.join(coord_pairs)}))"
        return wkt

    raise ValueError(f"Unsupported geometry type: {geojson['type']}")
