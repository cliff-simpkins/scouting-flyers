import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Volunteer Flyer Distribution</h1>
          <p>Management System</p>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function HomePage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Welcome to the Volunteer Flyer Distribution System</h2>
      <p>Authentication and features coming soon...</p>
      <p>
        <strong>API Status:</strong> Check{' '}
        <a href={process.env.REACT_APP_API_URL} target="_blank" rel="noopener noreferrer">
          {process.env.REACT_APP_API_URL}
        </a>
      </p>
    </div>
  );
}

export default App;
