/**
 * Zone Map - Display zones on a Leaflet map
 */
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import { Zone, ZoneWithAssignments } from '../../types';
import 'leaflet/dist/leaflet.css';
import './ZoneMap.css';

interface ZoneMapProps {
  zones: (Zone | ZoneWithAssignments)[];
  onZoneClick?: (zone: Zone | ZoneWithAssignments) => void;
}

// Component to handle map resize
const MapResizeHandler: React.FC<{ isMaximized: boolean }> = ({ isMaximized }) => {
  const map = useMap();

  useEffect(() => {
    // Give the CSS transition time to complete, then invalidate map size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [isMaximized, map]);

  return null;
};

// Component to fit map bounds to zones
const FitBounds: React.FC<{ zones: (Zone | ZoneWithAssignments)[] }> = ({ zones }) => {
  const map = useMap();

  useEffect(() => {
    if (zones.length > 0) {
      // Calculate bounds from all zone geometries
      let allCoords: [number, number][] = [];

      zones.forEach((zone) => {
        if (zone.geometry && zone.geometry.type === 'Polygon') {
          const coords = zone.geometry.coordinates[0];
          coords.forEach((coord: any) => {
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
  const [isMaximized, setIsMaximized] = useState(false);
  const [mapLayer, setMapLayer] = useState<'toner' | 'humanitarian'>('humanitarian');

  // Default center (if no zones)
  const defaultCenter: [number, number] = [51.505, -0.09];
  const defaultZoom = 13;

  const mapContent = (
    <>
      <button
        className="zone-map__layer-toggle-btn"
        onClick={() => setMapLayer(mapLayer === 'toner' ? 'humanitarian' : 'toner')}
        title={mapLayer === 'toner' ? 'Switch to Color map' : 'Switch to B&W map'}
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z"/>
          <path d="M3.5 8a4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0-9 0z"/>
        </svg>
        <span className="zone-map__layer-label">{mapLayer === 'toner' ? 'B&W' : 'Color'}</span>
      </button>
      <button
        className="zone-map__maximize-btn"
        onClick={() => setIsMaximized(!isMaximized)}
        title={isMaximized ? 'Restore map' : 'Maximize map'}
      >
        {isMaximized ? (
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
          </svg>
        )}
      </button>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="zone-map__container"
      >
        {mapLayer === 'toner' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>'
            url="https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          />
        )}

        {/* Render each zone as a polygon */}
        {zones.map((zone) => {
          if (!zone.geometry || zone.geometry.type !== 'Polygon') {
            return null;
          }

          // Convert coordinates from [lon, lat] to [lat, lon] for Leaflet
          const positions = zone.geometry.coordinates[0].map((coord: any) => [
            coord[1],
            coord[0],
          ]) as [number, number][];

          return (
            <Polygon
              key={zone.id}
              positions={positions}
              pathOptions={{
                color: zone.color || '#3388ff',
                fillColor: zone.color || '#3388ff',
                fillOpacity: 0.05,
                weight: 3,
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

        {/* Handle map resize when maximizing/restoring */}
        <MapResizeHandler isMaximized={isMaximized} />
      </MapContainer>
    </>
  );

  // When maximized, use a portal to render directly into body
  if (isMaximized) {
    return (
      <>
        <div className="zone-map" />
        {ReactDOM.createPortal(
          <div className="zone-map zone-map--maximized">
            {mapContent}
          </div>,
          document.body
        )}
      </>
    );
  }

  // Normal rendering
  return <div className="zone-map">{mapContent}</div>;
};

export default ZoneMap;
