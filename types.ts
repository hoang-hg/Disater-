export enum DisasterType {
  FLOOD = 'Lũ lụt',
  STORM = 'Bão / Áp thấp',
  LANDSLIDE = 'Sạt lở đất',
  EARTHQUAKE = 'Động đất',
  DROUGHT = 'Hạn hán',
  OTHER = 'Khác'
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  date: string;
  type: DisasterType;
  location: string;
  damage: string; // Summary of damage
  summary: string;
  isVerified: boolean;
  agency?: string; // Agency that confirmed the data
}

export interface StatSummary {
  totalDeaths: number;
  totalMissing: number;
  totalEconomicLoss: number; // In billions VND
  affectedHouses: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}