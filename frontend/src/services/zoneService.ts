/**
 * Zone service for API calls
 */
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_V1 = `${API_URL}/api/v1`;

interface Zone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  geometry: any; // GeoJSON geometry
  color?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface KMLImportResponse {
  zones_created: number;
  zones: Zone[];
  errors: string[];
}

interface KMLPreviewResponse {
  zone_count: number;
  zone_names: string[];
  errors: string[];
}

const zoneService = {
  /**
   * Get all zones for a project
   */
  async getProjectZones(projectId: string): Promise<Zone[]> {
    const token = localStorage.getItem('access_token');
    const response = await axios.get(`${API_V1}/zones/project/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Preview zones from KML file without importing
   */
  async previewKML(projectId: string, kmlContent: string): Promise<KMLPreviewResponse> {
    const token = localStorage.getItem('access_token');
    const response = await axios.post(
      `${API_V1}/zones/preview-kml`,
      {
        project_id: projectId,
        kml_content: kmlContent,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  /**
   * Import zones from KML file
   */
  async importKML(projectId: string, kmlContent: string, zonesToSkip: string[] = []): Promise<KMLImportResponse> {
    const token = localStorage.getItem('access_token');
    const response = await axios.post(
      `${API_V1}/zones/import-kml`,
      {
        project_id: projectId,
        kml_content: kmlContent,
        zones_to_skip: zonesToSkip,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  /**
   * Delete a zone
   */
  async deleteZone(zoneId: string): Promise<void> {
    const token = localStorage.getItem('access_token');
    await axios.delete(`${API_V1}/zones/${zoneId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async deleteAllZones(projectId: string): Promise<{ message: string; deleted_count: number }> {
    const token = localStorage.getItem('access_token');
    const response = await axios.delete(`${API_V1}/zones/project/${projectId}/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

export default zoneService;
export type { Zone, KMLImportResponse, KMLPreviewResponse };
