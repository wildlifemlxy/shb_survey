/*// src/data/shbData.js

// Parse the Excel-like data from your text file
const rawData = `Observer name	SHB individual ID (e.g. SHB1)	Location	Lat	Long	Date	Time	Height of tree/m	Height of bird/m	Activity (foraging, preening, calling, perching, others)
E.g. MS	SHB1	Dairy Farm	1.331035	103.422992	45618	0820	15	12	Foraging
JiaJun,Yun, Raymond,	SHB2	BBNP	1.347	103.763566	45641	0.3645833333333333	20	12	Perching
JiaJun,Yun, Raymond,	SHB3	BBNP	1.3504	103.7646	45641	0.3819444444444444	16	14	Calling
JiaJun,Yun, Raymond,	SHB4	BBNP	1.35123	103.76539	45641	0.3888888888888889	10	8	Calling, Perching
JiaJun,Yun, Raymond,	SHB1	BBNP	1.35146	103.7649	45641	0.3333333333333333	10	8	Calling
JiaJun,Yun, Raymond,	SHB5	BBNP	1.35123	103.76539	45641	0.39375	10	8	Calling
Jiajun, Chung Yi	SHB1	SBG	1.310082	103.814398	45643	0.3784722222222222	10	10	Calling
JJ,varsha R, Germaine lim, kang anya, keon lim, kwang boon,haz,steve oh	SHB1	RRNP	1.3431	103.7787	45645	0.3388888888888889	15	15	Calling,perching
JJ,varsha R, Germaine lim, kang anya, keon lim, kwang boon,haz,steve oh	SHB1	RRNP	1.3431	103.7787	45645	0.34375	15	15	2 flew off
Kwang Boon	SHB1	SBWR	1.440506	103.735108	45648	8.05 AM	15	13	Perching, Singing, then 3 flew off at 8.15am
Kwang Boon	SHB1	SBWR	1.440604	103.735146	45648	8.15 AM	13	12	Perching, singing, then 3 flew off at 8.30am
Kwang Boon, Zhi Jie and a friend	SHB1	Rail Corridor, Kranji	1.414142	103.754915	45654	8.10 AM	18	N/A	Singing
Kwang Boon, Zhi Jie, a friend	SHB1	Rail Corridor, Kranji	1.414251	103.755002	45654	9.15 AM	18	N/A	Singing
JJ, Steve, Seow Fong, Germaine, Keon	SHB1	Springleaf	1.40109	103.819359	45666	0.3326388888888889	N/A	N/A	Singing
JJ, Kwang Boon, Raymond, Steve	SHB1	Amazon River, Tree Frog entry on way to Iora,Mandai Boardwalk	1.401131	103.792359	45674	0.3298611111111111	5	5	Group Singing, then 4 flew to a higher tree and another 2 followed. Thereafter, can't spot which tree as there are a few tall trees around and they continue to sing
JJ, Kwang Boon, Raymond	SHB2	Rainforest Resort, Banyan Resorts, Mandai Boardwalk	1.407116	103.792745	45674	0.38958333333333334	18	18	Singing clearly can't spot which trees as we are about 5m away from the river
Tseng Wen, JJ, Haz and others	SHB1	Pulau Ubin	1.406141	103.969981	45682	0.4166666666666667	25	24	Calling, Perching, 1 confirmed sighting but likely to be pair as 2 birds took off thereafter but was unable to confirm species of 2nd bird
Tseng Wen	SHB1	Mandai Boardwalk	1.4061537	103.7930734	45697	17.38pm	10	6	Perching
Kwang Boon, Zhi Jie		Bidadari Park			45659	7.45AM			First recce for 2 hours with no luck to spot or hear any melody songs of SHB
Kwang Boon, a friend		Bidadari Park			45699	7.30AM			2nd trip, recce for 2.5 hours, again no luck.
Haz and mom	SHB1	Windsor Nature Park	1.3598687	103.8266265	45701	0.3277777777777778	4	3	Calling. On Syzygium campanulatum.
Haz and mom	SHB2	Windsor Nature Park	1.3608069	103.8254588	45701	0.34652777777777777	10	9.5	Group. 1 calling. 1 perching. 2 interacting with one another. Tree likely to be Diospyros sp.
Haz and mom	SHB3	Windsor Nature Park	1.3607914	103.8254219	45701	0.3506944444444444	1.8	1.5	Jumping about.
Tseng Wen, Sharon, Yun Feng	SHB1, 2	Hindhede Nature Park	1.3491978	103.7749333	45703	7.55 AM	23	22	Calling
Tseng Wen, Sharon, Yun Feng	SHB1, 2	Hindhede Nature Park	1.3491978	103.7749333	45703	7.58 AM	15	12	Perching
Tseng Wen, Sharon, Yun Feng	SHB1, 2	Hindhede Nature Park	1.3505744	103.7749481	45703	8.18 AM	2	1.8	Preening above shrub above lake. Calling.
Tseng Wen, Sharon, Yun Feng	SHB1, 2	Hindhede Nature Park	1.3511763	103.7754523	45703	8.20 AM	0.5	0.5	Calling, in shrub above lake
Tseng Wen, Sharon, Yun Feng	SHB1	Hindhede Nature Park	1.3404793	103.7749944	45703	8.36 AM	8	6	Perching
Tseng Wen, Sharon, Yun Feng	SHB2	Hindhede Nature Park	1.3404793	103.7749944	45703	8.36 AM	8	4	Perching
JJ,Anya,keon,Yihui,Raymond,Haz	SHB1	Bukit Batok nature park	1.350627	103.7645998	45708	8.11	2	3	Perching
JJ,Anya,keon,Yihui,Raymond,Haz	SHB 1, 2	Bukit Batok Nature Park	1.350627	103.7645998	45708	8.25	22	7	Perching
JJ,Anya,keon,Yihui,Raymond,Haz	SHB3	Bukit Batok nature park	1.350627	103.7645998	45708	8.25	20	8	Perching above lake
JJ,Anya,keon,Yihui,Raymond,Haz	SHB4	Bukit Batok nature park	1.350627	103.7645998	45708	8.31	2	2	Perching
JJ,Anya,keon,Yihui,Raymond,Haz	SHB 5, 6	Bukit Batok nature park	1.350627	103.7645998	45708	8.3	1	1	Perching on shrubs, then flew off
JJ,Anya,keon,Yihui,Raymond,Haz	SHB 7, 8	Bukit Batok nature park	1.350627	103.7645998	45708	8.41	2	2	Perching together on a branch
Kwang Boon	SHB1	Gillian Barracks	1.278055	103.804811	45711	7.30AM	5	5	Singing, jumping about, can't spot clearly.
Kwang Boon, a friend	SHB 1	Rifles Range Nature Park	1.344739	103.779083	45724	11.45AM	10	8	Piercing on a branch
Germaine, Anya, friend	SHB 1, 2	Mandai boardwalk	1.40638	103.79333	45747	8.44AM	6	3	Perching separately, then flew off
Keon	SHB 1	Bukit Timah nature reserve	1.3461171	103.775869	45747	3.24pm	3	4	Perching and calling on a branch
Haz and mom	SHB1, SHB2	Mandai Boardwalk	1.405431	103.79276	45749	0.34097222222222223	2	2	Singing and flying. Birds were seen on metal fence.
Haz and mom	SHB3	Mandai Boardwalk	1.405974	103.79293	45749	0.3458333333333333	10	9	Singing and perching.
Haz and mom	SHB4, SHB5	Mandai Boardwalk	1.406119	103.79305	45749	0.3527777777777778	5	3	Singing, preening and perching. 1 flew lower to 2.5m on same tree.
Haz and mom	SHB6	Mandai Boardwalk	1.40361	103.796269	45749	0.37083333333333335	1	1	Feeding and perching. Bird was seen on metal fence.
Haz and mom	SHB7	Mandai Boardwalk	1.402566	103.79651	45749	0.3888888888888889	12	12	Perching and staying still due to rain. Bird was seen on top of a rooftop shelter.
Haz and mom	SHB8, SHB9	Mandai Boardwalk	1.402563	103.79188	45749	0.41458333333333336	5	2	Flying and feeding on berries of small epiphytic climbers. Epiphytic plant was growing on another tree (Termanalia catappa). Heights of tree and bird measured from above water.
Haz and mom	SHB10	Mandai Boardwalk	1.401391	103.79232	45749	0.41805555555555557	10	8	Preening. Heights of tree and bird measured from above water.
Raymond,Yun,Keon,Germaine,Kwang Boon	SHB1	Rifles Range Nature Park	1.343833	103.7793611	45759	0.32222222222222224	15	12	Flew from another tree to this tree. Then calling on a branch.
Raymond,Yun,Keon,Germaine,Kwang Boon	SHB2	Rifles Range Nature Park	1.343983	103.7796396	45759	0.3472222222222222	6	5`; // Paste your full data 

const parseData = () => {
  const lines = rawData.trim().split('\n');
  const headers = lines[0].split('\t');
  
  return lines.slice(1).map(line => {
    const values = line.split('\t');
    const record = {};
    
    headers.forEach((header, index) => {
      record[header.trim()] = values[index];
    });
    
    // Convert Excel date format to standard date
    if (record.Date) {
      const excelDate = parseInt(record.Date);
      // Excel dates start from 1900-01-01, but there's a leap year bug
      // 25569 is the offset for 1970-01-01 (Unix epoch)
      const dateObj = new Date((excelDate - 25569) * 86400 * 1000);
      record.formattedDate = dateObj.toISOString().split('T')[0];
    }
    
    // Parse coordinates as numbers
    if (record.Lat) record.Lat = parseFloat(record.Lat);
    if (record.Long) record.Long = parseFloat(record.Long);
    
    // Handle the Activity column
    if (record.Activity) {
      record.Activity = record.Activity.split(',').map(activity => activity.trim());
    }
    
    return record;
  });
};

const shbData = parseData();
export default shbData;*/

import axios from 'axios';
import * as XLSX from 'xlsx';


// Function to fetch data from Google Sheets
/*async function fetchGoogleSheetData() {
  const CLIENT_ID = '261812636508-r3sndt2lc729l71sjn5ua6497vn1036g.apps.googleusercontent.com';
  const SHEET_ID = '1-3bnkdFg7JzntQ9kuLGsq2sQsGLgfEOg';
  const RANGE = 'Sheet1!A1:Z1000';
  const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
  const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', async () => {
      try {
        await gapi.client.init({
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES
        });

        // Sign in if needed
        if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
          await gapi.auth2.getAuthInstance().signIn();
        }

        // Fetch the data
        const response = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: RANGE
        });

        const data = response.result.values;
        console.log('Raw data from Google Sheet:', data);
        resolve(data);
      } catch (error) {
        console.error('Error fetching Google Sheets data:', error);
        reject(error);
      }
    });
  });
}*/
async function fetchGoogleSheetData() {
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSAL_sN7qwE1seWkiDF-TAl-T_s-gtuV9F6XQiKLOQ03ru-5DVwf-uRsZ0HjKlOyA/pub?output=xlsx';

  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error('Failed to fetch Google Sheet');
    const buffer = await response.arrayBuffer();

    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    console.log('Raw data from Google Sheet:', jsonData);
    return jsonData;
  } catch (error) {
    console.error('Error fetching or parsing Google Sheets data:', error);
    throw error;
  }
}

// Function to convert excel dates to standard date format
function formatExcelDate(excelDate) {
  if (!excelDate || isNaN(parseInt(excelDate))) return '';
  
  const date = new Date((parseInt(excelDate) - 25569) * 86400 * 1000);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function parseSheetData(rawData) {
  if (!rawData || !Array.isArray(rawData) || rawData.length < 2) {
    console.error('Invalid or empty data structure');
    return [];
  }

  // Extract headers from the first row
  const headers = Object.keys(rawData[0]);
  
  return rawData.map(row => {
    const record = {};
    
    headers.forEach(header => {
      record[header.trim()] = row[header] || '';
    });
    
    // Convert Excel date format to standard date if possible
    if (record.Date) {
      const excelDate = parseInt(record.Date);
      if (!isNaN(excelDate)) {
        record.Date = formatExcelDate(excelDate);
      }
    }
    
    // Parse coordinates as numbers
    if (record.Lat) record.Lat = parseFloat(record.Lat) || 0;
    if (record.Long) record.Long = parseFloat(record.Long) || 0;
    
    // Handle the Activity column - split by comma if it's a string
    if (record.Activity && typeof record.Activity === 'string') {
      record.Activity = record.Activity.split(',').map(activity => activity.trim());
    } else if (record.Activity) {
      record.Activity = [record.Activity];
    } else {
      record.Activity = [];
    }
    
    return record;
  });
}


// Main function to fetch and process data
async function fetchData() {
  try {
    const rawData = await fetchGoogleSheetData();
    rawData.splice(0, 1); // Removes the second item (index 1)
    const processedData = parseSheetData(rawData);
    console.log('Processed data:', processedData); // Make sure to log processed data
    return processedData;
  } catch (error) {
    console.error('Error in fetchData:', error);
    // Return fallback data or empty array
    return [];
  }
}

const shbData = await fetchData();
export default shbData;
