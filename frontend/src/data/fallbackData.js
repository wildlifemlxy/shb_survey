// Fallback survey data extracted from the existing dataset
// This ensures statistics work even if Google Sheets data fails to load

const fallbackSurveyData = [
  {
    "Observer name": "JiaJun,Yun, Raymond",
    "SHB individual ID": "SHB2",
    "Location": "BBNP",
    "Lat": 1.3504,
    "Long": 103.7646,
    "Date": "45641",
    "Time": "0.3645833333333333",
    "Height of tree/m": "20",
    "Height of bird/m": "12",
    "Activity": ["Perching"]
  },
  {
    "Observer name": "JiaJun,Yun, Raymond",
    "SHB individual ID": "SHB3",
    "Location": "BBNP",
    "Lat": 1.3504,
    "Long": 103.7646,
    "Date": "45641",
    "Time": "0.3819444444444444",
    "Height of tree/m": "16",
    "Height of bird/m": "14",
    "Activity": ["Calling"]
  },
  {
    "Observer name": "JiaJun,Yun, Raymond",
    "SHB individual ID": "SHB4",
    "Location": "BBNP",
    "Lat": 1.3504,
    "Long": 103.7646,
    "Date": "45641",
    "Time": "0.3888888888888889",
    "Height of tree/m": "10",
    "Height of bird/m": "8",
    "Activity": ["Calling", "Perching"]
  },
  {
    "Observer name": "Jiajun, Chung Yi",
    "SHB individual ID": "SHB1",
    "Location": "SBG",
    "Lat": 1.310082,
    "Long": 103.814398,
    "Date": "45643",
    "Time": "0.3784722222222222",
    "Height of tree/m": "10",
    "Height of bird/m": "10",
    "Activity": ["Calling"]
  },
  {
    "Observer name": "JJ,varsha R, Germaine lim, kang anya, keon lim, kwang boon,haz,steve oh",
    "SHB individual ID": "SHB1",
    "Location": "RRNP",
    "Lat": 1.3431,
    "Long": 103.7787,
    "Date": "45645",
    "Time": "0.3388888888888889",
    "Height of tree/m": "15",
    "Height of bird/m": "15",
    "Activity": ["Calling", "perching"]
  },
  {
    "Observer name": "Kwang Boon",
    "SHB individual ID": "SHB1",
    "Location": "SBWR",
    "Lat": 1.440506,
    "Long": 103.735108,
    "Date": "45648",
    "Time": "8.05 AM",
    "Height of tree/m": "15",
    "Height of bird/m": "13",
    "Activity": ["Perching", "Singing"]
  },
  {
    "Observer name": "Kwang Boon, Zhi Jie and a friend",
    "SHB individual ID": "SHB1",
    "Location": "Rail Corridor, Kranji",
    "Lat": 1.414142,
    "Long": 103.754915,
    "Date": "45654",
    "Time": "8.10 AM",
    "Height of tree/m": "18",
    "Height of bird/m": "N/A",
    "Activity": ["Singing"]
  },
  {
    "Observer name": "JJ, Steve, Seow Fong, Germaine, Keon",
    "SHB individual ID": "SHB1",
    "Location": "Springleaf",
    "Lat": 1.40109,
    "Long": 103.819359,
    "Date": "45666",
    "Time": "0.3326388888888889",
    "Height of tree/m": "N/A",
    "Height of bird/m": "N/A",
    "Activity": ["Singing"]
  },
  {
    "Observer name": "JJ, Kwang Boon, Raymond, Steve",
    "SHB individual ID": "SHB1",
    "Location": "Mandai Boardwalk",
    "Lat": 1.405431,
    "Long": 103.79276,
    "Date": "45674",
    "Time": "0.3298611111111111",
    "Height of tree/m": "5",
    "Height of bird/m": "5",
    "Activity": ["Group Singing"]
  },
  {
    "Observer name": "Tseng Wen, JJ, Haz and others",
    "SHB individual ID": "SHB1",
    "Location": "Pulau Ubin",
    "Lat": 1.406141,
    "Long": 103.969981,
    "Date": "45682",
    "Time": "0.4166666666666667",
    "Height of tree/m": "25",
    "Height of bird/m": "24",
    "Activity": ["Calling", "Perching"]
  },
  {
    "Observer name": "Haz and mom",
    "SHB individual ID": "SHB1",
    "Location": "Windsor Nature Park",
    "Lat": 1.3598687,
    "Long": 103.8266265,
    "Date": "45701",
    "Time": "0.3277777777777778",
    "Height of tree/m": "4",
    "Height of bird/m": "3",
    "Activity": ["Calling"]
  },
  {
    "Observer name": "Tseng Wen, Sharon, Yun Feng",
    "SHB individual ID": "SHB1",
    "Location": "Hindhede Nature Park",
    "Lat": 1.3491978,
    "Long": 103.7749333,
    "Date": "45703",
    "Time": "7.55 AM",
    "Height of tree/m": "23",
    "Height of bird/m": "22",
    "Activity": ["Calling"]
  },
  {
    "Observer name": "JJ,Anya,keon,Yihui,Raymond,Haz",
    "SHB individual ID": "SHB1",
    "Location": "Bukit Batok nature park",
    "Lat": 1.350627,
    "Long": 103.7645998,
    "Date": "45708",
    "Time": "8.11",
    "Height of tree/m": "2",
    "Height of bird/m": "3",
    "Activity": ["Perching"]
  },
  {
    "Observer name": "Kwang Boon",
    "SHB individual ID": "SHB1",
    "Location": "Gillian Barracks",
    "Lat": 1.278055,
    "Long": 103.804811,
    "Date": "45711",
    "Time": "7.30AM",
    "Height of tree/m": "5",
    "Height of bird/m": "5",
    "Activity": ["Singing"]
  },
  {
    "Observer name": "Germaine, Anya, friend",
    "SHB individual ID": "SHB1",
    "Location": "Mandai Boardwalk",
    "Lat": 1.405431,
    "Long": 103.79276,
    "Date": "45747",
    "Time": "8.44AM",
    "Height of tree/m": "6",
    "Height of bird/m": "3",
    "Activity": ["Perching"]
  },
  {
    "Observer name": "Keon",
    "SHB individual ID": "SHB1",
    "Location": "Bukit Timah nature reserve",
    "Lat": 1.3461171,
    "Long": 103.775869,
    "Date": "45747",
    "Time": "3.24pm",
    "Height of tree/m": "3",
    "Height of bird/m": "4",
    "Activity": ["Perching", "calling"]
  },
  {
    "Observer name": "Haz and mom",
    "SHB individual ID": "SHB1",
    "Location": "Mandai Boardwalk",
    "Lat": 1.405431,
    "Long": 103.79276,
    "Date": "45749",
    "Time": "0.34097222222222223",
    "Height of tree/m": "2",
    "Height of bird/m": "2",
    "Activity": ["Singing", "flying"]
  },
  {
    "Observer name": "Raymond,Yun,Keon,Germaine,Kwang Boon",
    "SHB individual ID": "SHB1",
    "Location": "Rifles Range Nature Park",
    "Lat": 1.343833,
    "Long": 103.7793611,
    "Date": "45759",
    "Time": "0.32222222222222224",
    "Height of tree/m": "15",
    "Height of bird/m": "12",
    "Activity": ["Calling"]
  }
];

export default fallbackSurveyData;
