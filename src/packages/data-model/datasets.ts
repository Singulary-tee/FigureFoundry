
const PENGUIN_RECORDS = [
  { species: 'Adelie', island: 'Torgersen', bill_length_mm: 39.1, bill_depth_mm: 18.7, flipper_length_mm: 181, body_mass_g: 3750, sex: 'male', year: 2007 },
  { species: 'Adelie', island: 'Torgersen', bill_length_mm: 39.5, bill_depth_mm: 17.4, flipper_length_mm: 186, body_mass_g: 3800, sex: 'female', year: 2007 },
  { species: 'Adelie', island: 'Torgersen', bill_length_mm: 40.3, bill_depth_mm: 18.0, flipper_length_mm: 195, body_mass_g: 3250, sex: 'female', year: 2007 },
  { species: 'Adelie', island: 'Torgersen', bill_length_mm: 36.7, bill_depth_mm: 19.3, flipper_length_mm: 193, body_mass_g: 3450, sex: 'female', year: 2007 },
  { species: 'Adelie', island: 'Torgersen', bill_length_mm: 39.3, bill_depth_mm: 20.6, flipper_length_mm: 190, body_mass_g: 3650, sex: 'male', year: 2007 },
  { species: 'Chinstrap', island: 'Dream', bill_length_mm: 46.5, bill_depth_mm: 17.9, flipper_length_mm: 192, body_mass_g: 3500, sex: 'female', year: 2007 },
  { species: 'Chinstrap', island: 'Dream', bill_length_mm: 50.0, bill_depth_mm: 19.5, flipper_length_mm: 196, body_mass_g: 3900, sex: 'male', year: 2007 },
  { species: 'Chinstrap', island: 'Dream', bill_length_mm: 51.3, bill_depth_mm: 19.2, flipper_length_mm: 197, body_mass_g: 3650, sex: 'male', year: 2007 },
  { species: 'Gentoo', island: 'Biscoe', bill_length_mm: 46.1, bill_depth_mm: 13.2, flipper_length_mm: 211, body_mass_g: 4500, sex: 'female', year: 2007 },
  { species: 'Gentoo', island: 'Biscoe', bill_length_mm: 50.0, bill_depth_mm: 16.3, flipper_length_mm: 230, body_mass_g: 5700, sex: 'male', year: 2007 },
  { species: 'Gentoo', island: 'Biscoe', bill_length_mm: 48.7, bill_depth_mm: 14.1, flipper_length_mm: 210, body_mass_g: 4450, sex: 'female', year: 2007 }
];

const GAPMINDER_RECORDS = [
  { country: 'Australia', continent: 'Oceania', year: 2007, lifeExp: 81.235, pop: 20434176, gdpPercap: 34435.37 },
  { country: 'Brazil', continent: 'Americas', year: 2007, lifeExp: 72.39, pop: 190010647, gdpPercap: 9065.80 },
  { country: 'Canada', continent: 'Americas', year: 2007, lifeExp: 80.653, pop: 33390141, gdpPercap: 36319.24 },
  { country: 'Egypt', continent: 'Africa', year: 2007, lifeExp: 71.338, pop: 80264543, gdpPercap: 5581.18 },
  { country: 'France', continent: 'Europe', year: 2007, lifeExp: 80.657, pop: 61083916, gdpPercap: 30470.02 },
  { country: 'Germany', continent: 'Europe', year: 2007, lifeExp: 79.406, pop: 82400996, gdpPercap: 32170.37 },
  { country: 'India', continent: 'Asia', year: 2007, lifeExp: 64.698, pop: 1110396331, gdpPercap: 2452.21 },
  { country: 'Japan', continent: 'Asia', year: 2007, lifeExp: 82.603, pop: 127467972, gdpPercap: 31656.07 },
  { country: 'United States', continent: 'Americas', year: 2007, lifeExp: 78.242, pop: 301139947, gdpPercap: 42951.65 }
];

const SEATTLE_WEATHER_RECORDS = [
  { date: '2012-01-01', precipitation: 0.0, temp_max: 12.8, temp_min: 5.0, wind: 4.7, weather: 'drizzle' },
  { date: '2012-01-02', precipitation: 10.9, temp_max: 10.6, temp_min: 2.8, wind: 4.5, weather: 'rain' },
  { date: '2012-01-03', precipitation: 0.8, temp_max: 11.7, temp_min: 7.2, wind: 2.3, weather: 'rain' },
  { date: '2012-04-15', precipitation: 0.0, temp_max: 18.3, temp_min: 6.7, wind: 3.2, weather: 'sun' },
  { date: '2012-07-20', precipitation: 0.0, temp_max: 28.9, temp_min: 14.4, wind: 2.1, weather: 'sun' },
  { date: '2012-10-10', precipitation: 5.1, temp_max: 15.6, temp_min: 10.0, wind: 3.8, weather: 'rain' }
];

export interface DatasetEntry {
  id: string;
  title: string;
  description: string;
  citation: string;
  records: Record<string, any>[];
}

export const DEMO_DATASETS: Record<string, DatasetEntry> = {
  'palmer-penguins': {
    id: 'palmer-penguins',
    title: 'Palmer Penguins Sample',
    description: 'Morphometric measurements for penguin species observed at Palmer Station, Antarctica.',
    citation: 'Gorman KB, Williams TD, Fraser WR (2014) PLoS ONE.',
    records: PENGUIN_RECORDS
  },
  'gapminder-life-expectancy': {
    id: 'gapminder-life-expectancy',
    title: 'Gapminder Indicators Sample',
    description: 'Country-level indicators measuring life expectancy, population size, and GDP per capita.',
    citation: 'Gapminder Foundation World Development Indicators.',
    records: GAPMINDER_RECORDS
  },
  'seattle-weather': {
    id: 'seattle-weather',
    title: 'Seattle Weather Sample',
    description: 'Daily precipitation, temperature, and wind speed recordings.',
    citation: 'NOAA Climate Data.',
    records: SEATTLE_WEATHER_RECORDS
  }
};
