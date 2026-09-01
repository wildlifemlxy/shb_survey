import React from 'react';
import Home from '../Home/Home.jsx';

function RifleRangeRoadHome(props) {
  return (
    <Home
      {...props}
      projectName="Rifle Range Road Project"
      projectPath="/RifleRangeRoad"
      databaseName="RifleRangeRoad"
    />
  );
}

export default RifleRangeRoadHome;