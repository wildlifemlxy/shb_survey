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

export const getUniqueSeenHeards = (data) => {
  const seenHeards = new Set(); // Set automatically ensures uniqueness
  
  data.forEach(observation => {
    if (observation["Seen/Heard"]) {
      seenHeards.add(observation["Seen/Heard"]); // Add location to the set
    }
  });
  
  // Convert the set to an array and return it
  return Array.from(seenHeards);
  };
  

// Function to get a unique set of location names
export const getUniqueActivity = (data) => {
  const activities = new Set(); // Set automatically ensures uniqueness

  data.forEach(observation => {
    const activity = observation["Activity (foraging, preening, calling, perching, others)"];
    if (activity && typeof activity === 'string') {
      activities.add(activity); // Add activity to the set
    }
  });

  // Convert the set to an array and return it
  return Array.from(activities);
};

// Function to count observations by activity
export const countByActivity = (data) => {
  const counts = {};
  
  data.forEach(observation => {
    const activity = observation["Activity (foraging, preening, calling, perching, others)"];
    if (activity && typeof activity === 'string') {
      const activities = activity.split(',').map(act => act.trim());
      
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

export const extractNoBirds = (data) => {
  return data.map(observation => {
    // Extract the value of "Height of tree/m" if available
    return observation["Number of Birds"] || null;
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
  const seenCounts = {};
  const heardCounts = {};
  const notFoundCounts = {};

  data.forEach(observation => {
    let date;

    // Handle date conversion based on input format
    if (typeof observation.Date === 'number') {
      date = convertExcelSerialDate(observation.Date);
    } else if (typeof observation.Date === 'string' && observation.Date.includes('/')) {
      const [day, month, year] = observation.Date.split('/');
      date = new Date(`${year}-${month}-${day}`);
    } else if (typeof observation.Date === 'string' && observation.Date.match(/\d{1,2}-[A-Za-z]{3}-\d{2,4}/)) {
      // Handle 'DD-MMM-YY' or 'DD-MMM-YYYY' format
      const [day, mon, year] = observation.Date.split('-');
      // Convert 2-digit year to 20xx (assume 2000+)
      let fullYear = year.length === 2 ? '20' + year : year;
      // Parse month string to month number
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthIdx = monthNames.findIndex(m => m.toLowerCase() === mon.toLowerCase());
      if (monthIdx !== -1) {
        date = new Date(parseInt(fullYear), monthIdx, parseInt(day));
      }
    }

    // Process only valid dates
    if (date instanceof Date && !isNaN(date)) {
      const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;

      // Count occurrences based on "Seen/Heard" field
      if (observation["Seen/Heard"] === 'Seen') {
        if (!seenCounts[monthYear]) {
          seenCounts[monthYear] = { monthYear, Seen: 0 };
        }
        seenCounts[monthYear].Seen++;
      } else if (observation["Seen/Heard"] === 'Heard') {
        if (!heardCounts[monthYear]) {
          heardCounts[monthYear] = { monthYear, Heard: 0 };
        }
        heardCounts[monthYear].Heard++;
      } else if (observation["Seen/Heard"] === 'Not found') {
        if (!notFoundCounts[monthYear]) {
          notFoundCounts[monthYear] = { monthYear, NotFound: 0 };
        }
        notFoundCounts[monthYear].NotFound++;
      }
    }
  });

  // Merge seen, heard, and not found counts and calculate total
  const result = [];
  const allMonthYears = new Set([
    ...Object.keys(seenCounts),
    ...Object.keys(heardCounts),
    ...Object.keys(notFoundCounts),
  ]);

  allMonthYears.forEach(monthYear => {
    const seen = seenCounts[monthYear]?.Seen || 0;
    const heard = heardCounts[monthYear]?.Heard || 0;
    const notFound = notFoundCounts[monthYear]?.NotFound || 0;
    const total = seen + heard + notFound;

    result.push({
      monthYear,
      Seen: seen,
      Heard: heard,
      NotFound: notFound,
      Total: total
    });
  });

  return result;
};

export const countByLocation = (data) => {
  const seenCounts = {};
  const heardCounts = {};

  data.forEach(observation => {
    // Ensure valid location and check for date
    let location = observation.Location;
    if (typeof location !== 'string' || !location.trim()) {
      console.warn("Skipping observation due to missing or invalid location:", observation);
      return;
    }

    // Handle "Seen/Heard" field
    const heardSeen = observation["Seen/Heard"];
    if (heardSeen !== 'Seen' && heardSeen !== 'Heard' && heardSeen !== 'Not found') {
      console.warn("Skipping observation with invalid 'Seen/Heard' field:", observation);
      return;
    }

    // Count based on location and Seen/Heard
    if (heardSeen === 'Seen') {
      if (!seenCounts[location]) {
        seenCounts[location] = { location, Seen: 0 };
      }
      seenCounts[location].Seen++;
    } else if (heardSeen === 'Heard') {
      if (!heardCounts[location]) {
        heardCounts[location] = { location, Heard: 0 };
      }
      heardCounts[location].Heard++;
    }
    // Add "Not found" to the heardCounts if applicable (optional, adjust as needed)
    else if (heardSeen === 'Not found') {
      if (!heardCounts[location]) {
        heardCounts[location] = { location, NotFound: 0 };
      }
      heardCounts[location].NotFound++;
    }
  });

  // Merge seen and heard counts for each location and calculate total
  const result = [];
  const allLocations = new Set([...Object.keys(seenCounts), ...Object.keys(heardCounts)]);

  allLocations.forEach(location => {
    const seen = seenCounts[location]?.Seen || 0;
    const heard = heardCounts[location]?.Heard || 0;
    const notFound = heardCounts[location]?.NotFound || 0;
    const total = seen + heard + notFound;

    result.push({
      location,
      Seen: seen,
      Heard: heard,
      NotFound: notFound,
      Total: total
    });
  });

  return result;
};
