// Function to count observations by location
export const countByLocation = (data) => {
    const counts = {};
    
    data.forEach(observation => {
      if (observation.Location) {
        counts[observation.Location] = (counts[observation.Location] || 0) + 1;
      }
    });
    
    return Object.entries(counts).map(([location, count]) => ({ location, count }));
  };
  
  // Function to count observations by activity
  export const countByActivity = (data) => {
    const counts = {};
    
    data.forEach(observation => {
      if (observation["Activity (foraging, preening, calling, perching, others)"]) {
        const activities = observation["Activity (foraging, preening, calling, perching, others)"].split(',').map(act => act.trim());
        
        activities.forEach(activity => {
          if (activity && !activity.includes('flew off')) {
            counts[activity] = (counts[activity] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(counts).map(([activity, count]) => ({ activity, count }));
  };

  export const countByMonthYear = (data) => {
    console.log("Month Year:", data);
    const counts = {};
  
    data.forEach(observation => {
      let date;
  
      // Check if observation.Date is a number (Excel serial date)
      if (typeof observation.Date === 'number') {
        date = convertExcelSerialDate(observation.Date);
      } 
      // Check if observation.Date is a string in dd/mm/yyyy format
      else if (typeof observation.Date === 'string' && observation.Date.includes('/')) {
        const [day, month, year] = observation.Date.split('/');  // Split dd/mm/yyyy
        date = new Date(`${year}-${month}-${day}`);  // Convert to yyyy-mm-dd format
      }
  
      if (date instanceof Date && !isNaN(date)) {
        const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`; // Format: "MM-YYYY"
        counts[monthYear] = (counts[monthYear] || 0) + 1;
      } else {
        console.warn(`Invalid date format in observation:`, observation.Date);
      }
    });
  
    // Sort by date (month-year)
    const sortedData = Object.entries(counts)
      .map(([monthYear, count]) => ({ monthYear, count }))
      .sort((a, b) => {
        const [monthA, yearA] = a.monthYear.split('-').map(Number);
        const [monthB, yearB] = b.monthYear.split('-').map(Number);
        return new Date(yearA, monthA - 1) - new Date(yearB, monthB - 1);
      });
  
    return sortedData;
  };
  
  
  export const getValidCoordinates = (data) => {
    if (!data) {
      return [];
    }
  
    const resolvedData = data; // Ensure that the data is resolved before filtering
    console.log("Resolved Data:", resolvedData);
  
    return resolvedData.filter(item => 
      item.Lat && item.Long && 
      !isNaN(item.Lat) && !isNaN(item.Long) &&
      item.Lat > 1.0 && item.Lat < 1.5 && // Valid Singapore latitude range
      item.Long > 103.5 && item.Long < 104.1 // Valid Singapore longitude range
    );
  };