/**
 * Zone Map - Display zones on a Leaflet map
 */
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import { Zone } from '../../services/zoneService';
import 'leaflet/dist/leaflet.css';
import './ZoneMap.css';

interface ZoneMapProps {
  zones: Zone[];
  onZoneClick?: (zone: Zone) => void;
}

// Component to fit map bounds to zones
const FitBounds: React.FC<{ zones: Zone[] }> = ({ zones }) => {
  const map = useMap();

  useEffect(() => {
    if (zones.length > 0) {
      // Calculate bounds from all zone geometries
      let allCoords: [number, number][] = [];

      zones.forEach((zone) => {
        if (zone.geometry && zone.geometry.type === 'Polygon') {
          const coords = zone.geometry.coordinates[0];
          coords.forEach((coord: [number, number]) => {
            allCoords.push([coord[1], coord[0]]); // [lat, lon]
          });
        }
      });

      if (allCoords.length > 0) {
        const bounds: LatLngBoundsExpression = allCoords;
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [zones, map]);

  return null;
};

const ZoneMap: React.FC<ZoneMapProps> = ({ zones, onZoneClick }) => {
  // Default center (if no zones)
  const defaultCenter: [number, number] = [51.505, -0.09];
  const defaultZoom = 13;

  return (
    <div className="zone-map">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="zone-map__container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render each zone as a polygon */}
        {zones.map((zone) => {
          if (!zone.geometry || zone.geometry.type !== 'Polygon') {
            return null;
          }

          // Convert coordinates from [lon, lat] to [lat, lon] for Leaflet
          const positions = zone.geometry.coordinates[0].map((coord: [number, number]) => [
            coord[1],
            coord[0],
          ]);

          return (
            <Polygon
              key={zone.id}
              positions={positions}
              pathOptions={{
                color: zone.color || '#3388ff',
                fillColor: zone.color || '#3388ff',
                fillOpacity: 0.2,
                weight: 2,
              }}
              eventHandlers={{
                click: () => {
                  if (onZoneClick) {
                    onZoneClick(zone);
                  }
                },
              }}
            >
              <Popup>
                <div className="zone-map__popup">
                  <h4>{zone.name}</h4>
                  {zone.description && <p>{zone.description}</p>}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Fit bounds to zones */}
        <FitBounds zones={zones} />
      </MapContainer>
    </div>
  );
};

export default ZoneMap;
