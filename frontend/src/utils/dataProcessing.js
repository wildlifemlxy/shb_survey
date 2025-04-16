// Function to get a unique set of location names
export const getUniqueLocations = (data) => {
const locations = new Set(); // Set automatically ensures uniqueness

data.forEach(observation => {
  if (observation.Location) {
    locations.add(observation.Location); // Add location to the set
  }
});

// Convert the set to an array and return it
return Array.from(locations);
};

// Function to get a unique set of location names
export const getUniqueActivity = (data) => {
  const activities = new Set(); // Set automatically ensures uniqueness

  data.forEach(observation => {
    if (observation["Activity (foraging, preening, calling, perching, others)"]) {
      activities.add(observation["Activity (foraging, preening, calling, perching, others)"]); // Add location to the set
    }
  });

  // Convert the set to an array and return it
  return Array.from(activities);
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

export const extractTreeHeights = (data) => {
  return data.map(observation => {
    // Extract the value of "Height of tree/m" if available
    return observation["Height of tree/m"] || null;
  });
};

export const extractSeenHeard = (data) => {
  return data.map(observation => {
    // Extract the value of "HSeen/Heard" if available
    return observation["Seen/Heard"] || null;
  });
};


export const extractBirdHeights = (data) => {
  return data.map(observation => {
    // Extract the value of "Height of tree/m" if available
    return observation["Height of bird/m"] || null;
  });
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

export const countByMonthYear = (data) => {
  const counts = {};

  data.forEach(observation => {
    let date;

    if (typeof observation.Date === 'number') {
      date = convertExcelSerialDate(observation.Date);
    } else if (typeof observation.Date === 'string' && observation.Date.includes('/')) {
      const [day, month, year] = observation.Date.split('/');
      date = new Date(`${year}-${month}-${day}`);
    }

    if (date instanceof Date && !isNaN(date)) {
      const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
      const type = observation["Heard/Seen"] === 'Seen' ? 'Seen' : 'Heard';

      if (!counts[monthYear]) {
        counts[monthYear] = { monthYear, Seen: 0, Heard: 0, Total: 0 };
      }

      counts[monthYear][type]++;
      counts[monthYear].Total++;
    }
  });

  return Object.values(counts);
};

export const countByLocation = (data) => {
  if (!Array.isArray(data)) {
    console.error("countByLocation: Expected an array of data, but got:", data);
    return [];
  }
  
  const counts = {};
  
  data.forEach(observation => {
    console.log("Observation:", observation);
    // Ensure that we have a valid location string
    let location = observation.Location;
    if (typeof location === 'string') {
      location = location.trim();
    }
    if (!location) {
      console.warn("Skipping observation due to missing location:", observation);
      return;
    }

    // Ensure that the Heard/Seen field is processed properly
    let heardSeen = observation["Seen/Heard"];
    console.log("Heard/Seen:", heardSeen);
    if (typeof heardSeen === 'string') {
      heardSeen = heardSeen.trim().toLowerCase();
    }
    else {
      console.warn("Observation missing 'Heard/Seen' field or not a string:", observation);
      return;
    }
    
    // Determine type from the field
    const type = (heardSeen === 'Seen') ? 'Seen' : 'Heard';

    // Initialize counts if location is new
    if (!counts[location]) {
      counts[location] = { location, Seen: 0, Heard: 0, Total: 0 };
    }

    counts[location][type]++;
    counts[location].Total++;
  });

  // Log the result for debugging
  console.log("Count by Location:", counts);

  return Object.values(counts);
};
