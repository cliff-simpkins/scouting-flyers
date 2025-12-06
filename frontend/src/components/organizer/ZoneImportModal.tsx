/**
 * Zone Import Modal - Upload and import KML files
 */
import React, { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import zoneService from '../../services/zoneService';
import { Zone } from '../../services/zoneService';
import DuplicateZoneModal, { DuplicateAction } from './DuplicateZoneModal';
import './ZoneImportModal.css';

interface ZoneImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  existingZones: Zone[];
}

const ZoneImportModal: React.FC<ZoneImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  existingZones,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ zones_created: number; errors: string[] } | null>(null);

  // Duplicate detection state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [currentDuplicate, setCurrentDuplicate] = useState<{ name: string; existingZoneId: string } | null>(null);
  const [pendingDuplicates, setPendingDuplicates] = useState<Array<{ name: string; existingZoneId: string }>>([]);
  const [kmlContent, setKmlContent] = useState<string | null>(null);
  const [zonesToSkip, setZonesToSkip] = useState<string[]>([]);
  const [processAll, setProcessAll] = useState(false);
  const [skipAll, setSkipAll] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.kml')) {
        setError('Please select a valid KML file');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || processing) {
      return;
    }

    try {
      setProcessing(true);
      setUploading(true);
      setError(null);
      setResult(null);

      // Reset state
      setZonesToSkip([]);
      setProcessAll(false);
      setSkipAll(false);

      // Read file content
      const fileContent = await selectedFile.text();
      setKmlContent(fileContent);

      // Preview KML to check for duplicates
      const preview = await zoneService.previewKML(projectId, fileContent);

      // Check for duplicates
      const existingZoneNames = new Map(existingZones.map(z => [z.name.toLowerCase(), z.id]));
      const foundDuplicates: Array<{ name: string; existingZoneId: string }> = [];

      for (const zoneName of preview.zone_names) {
        const existingZoneId = existingZoneNames.get(zoneName.toLowerCase());
        if (existingZoneId) {
          foundDuplicates.push({ name: zoneName, existingZoneId });
        }
      }

      if (foundDuplicates.length > 0) {
        // Process duplicates one by one
        setPendingDuplicates(foundDuplicates);
        setCurrentDuplicate(foundDuplicates[0]);
        setShowDuplicateModal(true);
        setUploading(false);
      } else {
        // No duplicates, proceed with import
        await performImport(fileContent, []);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import KML file');
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleDuplicateAction = async (action: DuplicateAction) => {
    if (!currentDuplicate) return;

    let newSkipList = [...zonesToSkip];
    let shouldProcessAll = processAll;
    let shouldSkipAll = skipAll;

    // Process current duplicate based on action
    if (action === 'yes' || action === 'yes_all') {
      // Delete existing zone and allow import
      try {
        await zoneService.deleteZone(currentDuplicate.existingZoneId);
        console.log(`Deleted existing zone: ${currentDuplicate.name}`);
      } catch (err) {
        console.error(`Failed to delete zone ${currentDuplicate.name}:`, err);
      }

      if (action === 'yes_all') {
        shouldProcessAll = true;
        setProcessAll(true);
      }
    } else if (action === 'no' || action === 'no_all') {
      // Skip this zone (don't import)
      newSkipList.push(currentDuplicate.name);
      setZonesToSkip(newSkipList);
      console.log(`Skipping zone: ${currentDuplicate.name}`);

      if (action === 'no_all') {
        shouldSkipAll = true;
        setSkipAll(true);
      }
    }

    // Find remaining duplicates
    const currentIndex = pendingDuplicates.findIndex(d => d.name === currentDuplicate.name);
    const remainingDuplicates = pendingDuplicates.slice(currentIndex + 1);

    // Check if we need to continue showing prompts
    if (remainingDuplicates.length > 0 && !shouldProcessAll && !shouldSkipAll) {
      // More duplicates to process and no "all" flag set - show next prompt
      setCurrentDuplicate(remainingDuplicates[0]);
    } else {
      // Either no more duplicates, or we have an "all" flag set
      setShowDuplicateModal(false);
      setUploading(true);

      // Process remaining duplicates based on flags
      for (const dup of remainingDuplicates) {
        if (shouldProcessAll) {
          // Delete and allow import
          try {
            await zoneService.deleteZone(dup.existingZoneId);
            console.log(`Deleted existing zone: ${dup.name}`);
          } catch (err) {
            console.error(`Failed to delete zone ${dup.name}:`, err);
          }
        } else if (shouldSkipAll) {
          // Skip (don't import)
          newSkipList.push(dup.name);
          console.log(`Skipping zone: ${dup.name}`);
        }
      }

      console.log('Final zones to skip:', newSkipList);
      // Import all zones except those in skip list
      await performImport(kmlContent!, newSkipList);
    }
  };

  const performImport = async (fileContent: string, zonesToSkip: string[] = []) => {
    console.log('performImport called with zonesToSkip:', zonesToSkip);
    try {
      const response = await zoneService.importKML(projectId, fileContent, zonesToSkip);

      setResult({
        zones_created: response.zones_created,
        errors: response.errors,
      });

      if (response.zones_created > 0) {
        // Success!
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        // No zones created - still reset processing
        setProcessing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import KML file');
      setProcessing(false);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setResult(null);
    setUploading(false);
    setProcessing(false);
    setShowDuplicateModal(false);
    setCurrentDuplicate(null);
    setPendingDuplicates([]);
    setZonesToSkip([]);
    setProcessAll(false);
    setSkipAll(false);
    setKmlContent(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Zones from KML">
      <div className="zone-import-modal">
        <div className="zone-import-modal__instructions">
          <h3>Instructions:</h3>
          <ol>
            <li>Export your zones from Google My Maps as a KML file</li>
            <li>Select the KML file below</li>
            <li>Click "Import" to add zones to your project</li>
          </ol>
        </div>

        <div className="zone-import-modal__file-input">
          <label htmlFor="kml-file" className="zone-import-modal__label">
            Select KML File:
          </label>
          <input
            type="file"
            id="kml-file"
            accept=".kml"
            onChange={handleFileChange}
            className="zone-import-modal__input"
            disabled={uploading}
          />
          {selectedFile && (
            <div className="zone-import-modal__selected-file">
              Selected: <strong>{selectedFile.name}</strong>
            </div>
          )}
        </div>

        {error && (
          <div className="zone-import-modal__error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="zone-import-modal__result">
            <div className="zone-import-modal__success">
              ✓ Successfully imported {result.zones_created} zone(s)
            </div>
            {result.errors.length > 0 && (
              <div className="zone-import-modal__warnings">
                <strong>Warnings:</strong>
                <ul>
                  {result.errors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="zone-import-modal__actions">
          <Button variant="secondary" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!selectedFile || uploading || processing}
          >
            {uploading ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>

      {/* Duplicate Zone Modal */}
      {showDuplicateModal && currentDuplicate && (
        <DuplicateZoneModal
          isOpen={showDuplicateModal}
          zoneName={currentDuplicate.name}
          onAction={handleDuplicateAction}
        />
      )}
    </Modal>
  );
};

export default ZoneImportModal;
