export interface TreeData {
  id: string;
  name: string;
  scientificName: string;
  count: number;
  height: number;
  canopyArea: number;
  co2Sequestration: number;
}

export interface TreePoint {
  id: string;
  name: string;
  species: string;
  lat: number;
  lng: number;
  count: number;
}

export async function fetchTreePoints(): Promise<TreePoint[]> {
  const points: TreePoint[] = [
    { id: 'p1', name: 'Tel Aviv', species: 'Olea europaea', lat: 32.0853, lng: 34.7818, count: 4200 },
    { id: 'p2', name: 'Jerusalem', species: 'Quercus calliprinos', lat: 31.7683, lng: 35.2137, count: 6800 },
    { id: 'p3', name: 'Haifa', species: 'Pinus halepensis', lat: 32.7940, lng: 34.9896, count: 5300 },
    { id: 'p4', name: "Be'er Sheva", species: 'Phoenix canariensis', lat: 31.252973, lng: 34.791462, count: 2900 },
    { id: 'p5', name: "Ra'anana", species: 'Cupressus sempervirens', lat: 32.1840, lng: 34.8710, count: 1500 },
    { id: 'p6', name: 'Ashdod', species: 'Pinus halepensis', lat: 31.8044, lng: 34.6553, count: 2200 },
    { id: 'p7', name: 'Netanya', species: 'Quercus calliprinos', lat: 32.3215, lng: 34.8532, count: 1800 },
    { id: 'p8', name: 'Herzliya', species: 'Olea europaea', lat: 32.1663, lng: 34.8430, count: 1300 }
  ];
  await new Promise((r) => setTimeout(r, 200));
  return points;
}

export async function fetchTreeData(): Promise<TreeData[]> {
  try {
    // In a real implementation, you would fetch from the actual API
    // For now, we'll use sample data that matches the structure
    const sampleData: TreeData[] = [
      {
        id: '1',
        name: 'אלון מצוי',
        scientificName: 'Quercus calliprinos',
        count: 12450,
        height: 15,
        canopyArea: 8.5,
        co2Sequestration: 22.3
      },
      {
        id: '2',
        name: 'אורן ירושלים',
        scientificName: 'Pinus halepensis',
        count: 18700,
        height: 20,
        canopyArea: 12.1,
        co2Sequestration: 28.7
      },
      {
        id: '3',
        name: 'זית אירופי',
        scientificName: 'Olea europaea',
        count: 9200,
        height: 12,
        canopyArea: 6.8,
        co2Sequestration: 18.5
      },
      {
        id: '4',
        name: 'דקל קנרי',
        scientificName: 'Phoenix canariensis',
        count: 5400,
        height: 18,
        canopyArea: 9.2,
        co2Sequestration: 15.8
      },
      {
        id: '5',
        name: 'ברוש מצוי',
        scientificName: 'Cupressus sempervirens',
        count: 7600,
        height: 25,
        canopyArea: 5.3,
        co2Sequestration: 19.2
      }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return sampleData;
  } catch (error) {
    console.error('Error fetching tree data:', error);
    throw new Error('Failed to load tree data');
  }
}
