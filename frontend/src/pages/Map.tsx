import React from 'react';
import { Container } from '../components/common/Container';
import { MapContainer } from '../components/map/MapContainer';

export const Map: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer />
    </div>
  );
};

