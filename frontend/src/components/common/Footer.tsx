/**
 * Footer component that displays backend server information
 */
import React, { useEffect, useState } from 'react';
import './Footer.css';

interface ServerInfo {
  status: string;
  version: string;
}

const Footer: React.FC = () => {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const fetchServerInfo = async () => {
      try {
        const response = await fetch('http://localhost:8000/');
        if (response.ok) {
          const data = await response.json();
          setServerInfo({
            status: 'healthy',
            version: data.version
          });
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      }
    };

    fetchServerInfo();
    // Refresh every 30 seconds
    const interval = setInterval(fetchServerInfo, 30000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <footer className="footer footer--error">
        <div className="footer__content">
          Backend: Offline
        </div>
      </footer>
    );
  }

  if (!serverInfo) {
    return (
      <footer className="footer">
        <div className="footer__content">
          Loading server info...
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="footer__content">
        <span className="footer__item">
          <strong>Backend:</strong> v{serverInfo.version}
        </span>
        <span className="footer__separator">|</span>
        <span className={`footer__status footer__status--${serverInfo.status}`}>
          {serverInfo.status}
        </span>
      </div>
    </footer>
  );
};

export default Footer;
