/**
 * VolunteerZoneMap - Map component for volunteers with geolocation
 */
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer, TileLayer, Polygon, Popup, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import { LatLngBoundsExpression, Icon, LatLng, LeafletMouseEvent } from 'leaflet';
import { Zone } from '../../types';
import completionService, { CompletionArea } from '../../services/completionService';
import 'leaflet/dist/leaflet.css';
import './VolunteerZoneMap.css';

interface VolunteerZoneMapProps {
  zones: Zone[];
  assignmentId?: string; // Optional: if provided, enables completion tracking
  onZoneClick?: (zone: Zone) => void;
  readOnly?: boolean; // Optional: if true, disables marking controls
}

// Component to handle click events for marking/unmarking completion
const CompletionMarker: React.FC<{
  markingMode: 'none' | 'marking' | 'unmarking';
  onMark: (latlng: LatLng) => void;
  onUnmark: (latlng: LatLng) => void;
}> = ({ markingMode, onMark, onUnmark }) => {
  const map = useMap();

  useMapEvents({
    click(e: LeafletMouseEvent) {
      console.log('Map clicked!', 'Marking mode:', markingMode, 'Position:', e.latlng);
      if (markingMode === 'marking') {
        console.log('Calling onMark...');
        onMark(e.latlng);
      } else if (markingMode === 'unmarking') {
        console.log('Calling onUnmark...');
        onUnmark(e.latlng);
      }
    },
  });

  // Change cursor when marking mode changes
  React.useEffect(() => {
    const container = map.getContainer();
    if (markingMode !== 'none') {
      container.style.cursor = 'crosshair';
      console.log('Cursor set to crosshair');
    } else {
      container.style.cursor = '';
      console.log('Cursor reset');
    }
  }, [markingMode, map]);

  return null;
};

// Component to handle map resize
const MapResizeHandler: React.FC<{ isMaximized: boolean }> = ({ isMaximized }) => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [isMaximized, map]);

  return null;
};

// Component to fit map bounds to zones
const FitBounds: React.FC<{ zones: Zone[]; userLocation: LatLng | null }> = ({ zones, userLocation }) => {
  const map = useMap();

  useEffect(() => {
    let allCoords: [number, number][] = [];

    // Add zone coordinates
    zones.forEach((zone) => {
      if (zone.geometry && zone.geometry.type === 'Polygon') {
        const coords = zone.geometry.coordinates[0];
        coords.forEach((coord: any) => {
          allCoords.push([coord[1], coord[0]]); // [lat, lon]
        });
      }
    });

    // Add user location if available
    if (userLocation) {
      allCoords.push([userLocation.lat, userLocation.lng]);
    }

    if (allCoords.length > 0) {
      const bounds: LatLngBoundsExpression = allCoords;
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [zones, userLocation, map]);

  return null;
};

// Custom icon for user location
const userLocationIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" fill-opacity="0.2"/>
      <circle cx="12" cy="12" r="3" fill="#2563eb"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const VolunteerZoneMap: React.FC<VolunteerZoneMapProps> = ({ zones, assignmentId, onZoneClick, readOnly = false }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [mapLayer, setMapLayer] = useState<'toner' | 'humanitarian'>('humanitarian');
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Completion tracking state
  const [completionAreas, setCompletionAreas] = useState<CompletionArea[]>([]);
  const [markingMode, setMarkingMode] = useState<'none' | 'marking' | 'unmarking'>('none');
  const markRadius = 10; // meters - radius of marked areas

  // Default center (if no zones or location)
  const defaultCenter: [number, number] = [51.505, -0.09];
  const defaultZoom = 13;

  // Request geolocation on mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Load completion areas
  useEffect(() => {
    if (assignmentId) {
      loadCompletionAreas();
    }
  }, [assignmentId]);

  const loadCompletionAreas = async () => {
    if (!assignmentId) return;

    try {
      const areas = await completionService.getCompletionAreas(assignmentId);
      setCompletionAreas(areas);
    } catch (err) {
      console.error('Failed to load completion areas:', err);
    }
  };

  const handleMarkArea = async (latlng: LatLng) => {
    if (!assignmentId) return;

    console.log('Marking area at:', latlng);

    try {
      // Create a circular geometry around the click point
      const geometry = {
        type: 'Point',
        coordinates: [latlng.lng, latlng.lat]
      };

      console.log('Sending geometry:', geometry);
      const result = await completionService.createCompletionArea(assignmentId, geometry);
      console.log('Area marked successfully:', result);
      await loadCompletionAreas(); // Reload to show the new area
    } catch (err) {
      console.error('Failed to mark area:', err);
      alert('Failed to mark area: ' + (err as Error).message);
    }
  };

  const handleUnmarkArea = async (latlng: LatLng) => {
    if (!assignmentId) return;

    console.log('Unmarking area at:', latlng);

    try {
      // Find completion areas near this click
      // Calculate distance to each area and find the closest one within marking radius
      let closestArea: CompletionArea | null = null;
      let closestDistance: number = Infinity;

      completionAreas.forEach((area) => {
        if (area.geometry.type === 'Point') {
          const [lng, lat] = area.geometry.coordinates;
          const areaLatLng = new LatLng(lat, lng);
          const distance = latlng.distanceTo(areaLatLng);

          // Only consider areas within 2x the mark radius
          if (distance <= markRadius * 2 && distance < closestDistance) {
            closestArea = area;
            closestDistance = distance;
          }
        }
      });

      if (closestArea) {
        const areaToDelete = closestArea as CompletionArea;
        console.log('Deleting area:', areaToDelete.id);
        await completionService.deleteCompletionArea(areaToDelete.id);
        console.log('Area deleted successfully');
        await loadCompletionAreas(); // Reload to remove the deleted area
      } else {
        console.log('No area found near click');
      }
    } catch (err) {
      console.error('Failed to unmark area:', err);
      alert('Failed to unmark area: ' + (err as Error).message);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation(new LatLng(latitude, longitude));
        setIsLocating(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setLocationError(errorMessage);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const mapContent = (
    <>
      <button
        className="volunteer-zone-map__layer-toggle-btn"
        onClick={() => setMapLayer(mapLayer === 'toner' ? 'humanitarian' : 'toner')}
        title={mapLayer === 'toner' ? 'Switch to Color map' : 'Switch to B&W map'}
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z"/>
          <path d="M3.5 8a4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0-9 0z"/>
        </svg>
        <span className="volunteer-zone-map__layer-label">{mapLayer === 'toner' ? 'B&W' : 'Color'}</span>
      </button>

      {assignmentId && !readOnly && (
        <button
          className={`volunteer-zone-map__mark-btn ${markingMode !== 'none' ? 'volunteer-zone-map__mark-btn--active' : ''} ${markingMode === 'unmarking' ? 'volunteer-zone-map__mark-btn--unmark' : ''}`}
          onClick={() => {
            if (markingMode === 'none') {
              setMarkingMode('marking');
            } else if (markingMode === 'marking') {
              setMarkingMode('unmarking');
            } else {
              setMarkingMode('none');
            }
          }}
          title={
            markingMode === 'none'
              ? 'Mark areas as completed'
              : markingMode === 'marking'
              ? 'Switch to unmark mode'
              : 'Stop marking/unmarking'
          }
        >
          {markingMode === 'marking' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          )}
          {markingMode === 'unmarking' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14"/>
            </svg>
          )}
          {markingMode === 'none' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          )}
          <span className="volunteer-zone-map__mark-label">
            {markingMode === 'none' ? 'Mark' : markingMode === 'marking' ? 'Unmark' : 'Stop'}
          </span>
        </button>
      )}

      {readOnly && (
        <div className="volunteer-zone-map__readonly-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          View Only - Zone Completed
        </div>
      )}

      <button
        className="volunteer-zone-map__locate-btn"
        onClick={requestLocation}
        disabled={isLocating}
        title={userLocation ? 'Update my location' : 'Find my location'}
      >
        {isLocating ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="volunteer-zone-map__locate-spinner">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25"/>
            <path d="M12 2 A 10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>

      <button
        className="volunteer-zone-map__maximize-btn"
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

      {locationError && (
        <div className="volunteer-zone-map__location-error">
          {locationError}
        </div>
      )}

      {markingMode !== 'none' && (
        <div className="volunteer-zone-map__marking-instructions">
          {markingMode === 'marking'
            ? 'Click on the map to mark areas as completed'
            : 'Click on a mark to remove it'}
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className={`volunteer-zone-map__container ${markingMode !== 'none' ? 'volunteer-zone-map__container--marking' : ''}`}
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

          const positions = zone.geometry.coordinates[0].map((coord: any) => [
            coord[1],
            coord[0],
          ]) as [number, number][];

          // When in marking/unmarking mode, render on shadowPane (below map events)
          // Otherwise render on overlayPane (normal)
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
              pane={markingMode !== 'none' ? 'tilePane' : 'overlayPane'}
              interactive={false}
              eventHandlers={
                markingMode === 'none' && onZoneClick
                  ? {
                      click: () => {
                        onZoneClick(zone);
                      },
                    }
                  : {}
              }
            >
              {markingMode === 'none' && (
                <Popup>
                  <div className="volunteer-zone-map__popup">
                    <h4>{zone.name}</h4>
                    {zone.description && <p>{zone.description}</p>}
                  </div>
                </Popup>
              )}
            </Polygon>
          );
        })}

        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <div className="volunteer-zone-map__popup">
                <h4>Your Location</h4>
                <p>Lat: {userLocation.lat.toFixed(6)}</p>
                <p>Lng: {userLocation.lng.toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Completion areas - rendered as circles with 50% opacity */}
        {completionAreas.map((area) => {
          if (area.geometry.type === 'Point') {
            const [lng, lat] = area.geometry.coordinates;
            return (
              <Circle
                key={area.id}
                center={[lat, lng]}
                radius={markRadius}
                pathOptions={{
                  color: '#059669',
                  fillColor: '#059669',
                  fillOpacity: 0.5,
                  weight: 2,
                }}
              />
            );
          }
          return null;
        })}

        {/* Handle click events for marking/unmarking */}
        {assignmentId && !readOnly && (
          <CompletionMarker
            markingMode={markingMode}
            onMark={handleMarkArea}
            onUnmark={handleUnmarkArea}
          />
        )}

        {/* Fit bounds to zones and user location */}
        <FitBounds zones={zones} userLocation={userLocation} />

        {/* Handle map resize when maximizing/restoring */}
        <MapResizeHandler isMaximized={isMaximized} />
      </MapContainer>
    </>
  );

  // When maximized, use a portal to render directly into body
  if (isMaximized) {
    return (
      <>
        <div className="volunteer-zone-map" />
        {ReactDOM.createPortal(
          <div className="volunteer-zone-map volunteer-zone-map--maximized">
            {mapContent}
          </div>,
          document.body
        )}
      </>
    );
  }

  // Normal rendering
  return <div className="volunteer-zone-map">{mapContent}</div>;
};

export default VolunteerZoneMap;
