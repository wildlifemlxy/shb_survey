import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Dashboard from '../Dashboard/Dashboard.jsx';
import { getRifleRangeRoadSurveyData } from '../../data/riflerangeroad/surveyData.js';
import { BASE_URL } from '../../config/apiConfig.js';

function RifleRangeRoadDashboard(props) {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const refreshRecords = () => {
      getRifleRangeRoadSurveyData().then(rifleRecords => {
        if (isMounted) setRecords(rifleRecords);
      });
    };

    refreshRecords();

    const socket = io(BASE_URL);
    socket.on('surveyInserted', refreshRecords);
    socket.on('surveyUpdated', refreshRecords);
    socket.on('surveyDeleted', refreshRecords);

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, []);

  return <Dashboard {...props} dashboardData={records} enableTypeTabs hideAllDataType defaultDataType="Data (Regular) cleaned" hideTypeLabel hideLocationActivity filterClassName="rifle-filters" projectName="Rifle Range Road Project" projectPath="/RifleRangeRoad" />;
}

export default RifleRangeRoadDashboard;