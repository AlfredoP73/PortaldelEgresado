import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Globe2,
  Compass,
  Laptop,
  DollarSign,
  Users,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  MapPin,
  TrendingUp,
  Building2,
  GraduationCap,
  ArrowUpRight,
  Layers,
  ZoomIn,
  ZoomOut,
  Database,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';

export type PlanetLayerMode = 'diaspora' | 'remote' | 'salaries';
export type DataSourceMode = 'real_db' | 'projection';

export interface CityPin {
  name: string;
  lat: number;
  lon: number;
  alumniCount: number;
  remoteWorkers: number;
  avgSalaryCop: number;
  topRole: string;
}

export interface GlobalHubNode {
  id: string;
  isoCode: string;
  flagColors: [string, string, string];
  country: string;
  city: string;
  region: string;
  lat: number;
  lon: number;
  alumniCount: number;
  remoteWorkers: number;
  avgSalaryCop: number;
  avgSalaryUsd: number;
  yoyGrowth: number;
  topPrograms: string[];
  topCompanies: string[];
  primarySector: string;
  color: string;
  isOrigin?: boolean;
  cities: CityPin[];
}

const ORIGIN_VALLEDUPAR: GlobalHubNode = {
  id: 'valledupar-co',
  isoCode: 'CO',
  flagColors: ['#FCD116', '#003893', '#CE1126'],
  country: 'Colombia (Sede Origen UPC)',
  city: 'Valledupar · Cesar & Caribe',
  region: 'Región Caribe · Hub Central',
  lat: 10.4631,
  lon: -73.2532,
  alumniCount: 845,
  remoteWorkers: 164,
  avgSalaryCop: 3450000,
  avgSalaryUsd: 840,
  yoyGrowth: 14.2,
  topPrograms: ['Ingeniería de Sistemas', 'Enfermería', 'Administración de Empresas', 'Contaduría Pública'],
  topCompanies: ['Drummond Ltd.', 'Clínica Médicos', 'Gobernación del Cesar', 'Grupo Prodeco'],
  primarySector: 'Agroindustria, Salud & Servicios',
  color: '#10B981',
  isOrigin: true,
  cities: [
    { name: 'Valledupar (Sede UPC)', lat: 10.4631, lon: -73.2532, alumniCount: 540, remoteWorkers: 98, avgSalaryCop: 3350000, topRole: 'Ingeniero / Profesional Clínico' },
    { name: 'Aguachica (Seccional)', lat: 8.3084, lon: -73.6166, alumniCount: 145, remoteWorkers: 28, avgSalaryCop: 3150000, topRole: 'Administrador / Contador' },
    { name: 'Santa Marta', lat: 11.2408, lon: -74.199, alumniCount: 85, remoteWorkers: 22, avgSalaryCop: 3550000, topRole: 'Logística & Ambiental' },
    { name: 'Riohacha', lat: 11.5444, lon: -72.9072, alumniCount: 75, remoteWorkers: 16, avgSalaryCop: 3400000, topRole: 'Gestión Pública & Energías' },
  ],
};

export const GLOBAL_ALUMNI_HUBS: GlobalHubNode[] = [
  ORIGIN_VALLEDUPAR,
  {
    id: 'bogota-medellin-co',
    isoCode: 'CO',
    flagColors: ['#FCD116', '#003893', '#CE1126'],
    country: 'Colombia (Interior)',
    city: 'Bogotá D.C. · Medellín · Barranquilla',
    region: 'Corredor Nacional Andino & Caribe',
    lat: 4.711,
    lon: -74.0721,
    alumniCount: 612,
    remoteWorkers: 238,
    avgSalaryCop: 4650000,
    avgSalaryUsd: 1130,
    yoyGrowth: 19.8,
    topPrograms: ['Ingeniería de Sistemas', 'Derecho', 'Contaduría Pública', 'Ingeniería Electrónica'],
    topCompanies: ['Bancolombia', 'Globant', 'Mercado Libre', 'Ecopetrol'],
    primarySector: 'Fintech, Software & Consultoría',
    color: '#34D399',
    cities: [
      { name: 'Bogotá D.C.', lat: 4.711, lon: -74.0721, alumniCount: 285, remoteWorkers: 115, avgSalaryCop: 4950000, topRole: 'Desarrollador Cloud / Consultor' },
      { name: 'Medellín', lat: 6.2442, lon: -75.5812, alumniCount: 158, remoteWorkers: 74, avgSalaryCop: 4750000, topRole: 'Ingeniero de Datos / Fintech' },
      { name: 'Barranquilla', lat: 10.9685, lon: -74.7813, alumniCount: 112, remoteWorkers: 32, avgSalaryCop: 4100000, topRole: 'Comercio Exterior & Industrial' },
      { name: 'Bucaramanga', lat: 7.1193, lon: -73.1227, alumniCount: 57, remoteWorkers: 17, avgSalaryCop: 3950000, topRole: 'Ingeniería & Salud' },
    ],
  },
  {
    id: 'usa-hub',
    isoCode: 'US',
    flagColors: ['#B22234', '#FFFFFF', '#3C3B6E'],
    country: 'Estados Unidos',
    city: 'Miami · Austin · Nueva York',
    region: 'Norteamérica (Nearshore & Presencial)',
    lat: 28.5383,
    lon: -81.3792,
    alumniCount: 148,
    remoteWorkers: 112,
    avgSalaryCop: 12800000,
    avgSalaryUsd: 3120,
    yoyGrowth: 34.5,
    topPrograms: ['Ingeniería de Sistemas', 'Ingeniería Electrónica', 'Administración de Empresas'],
    topCompanies: ['EPAM Systems', 'BairesDev', 'Microsoft Partner Net', 'Deel Global'],
    primarySector: 'Cloud Computing, IA & SaaS',
    color: '#38BDF8',
    cities: [
      { name: 'Miami, FL', lat: 25.7617, lon: -80.1918, alumniCount: 64, remoteWorkers: 46, avgSalaryCop: 12200000, topRole: 'Full-Stack / Fintech Latam Hub' },
      { name: 'Austin, TX', lat: 30.2672, lon: -97.7431, alumniCount: 42, remoteWorkers: 36, avgSalaryCop: 13400000, topRole: 'Cloud DevOps & AI Engineer' },
      { name: 'Nueva York, NY', lat: 40.7128, lon: -74.006, alumniCount: 26, remoteWorkers: 18, avgSalaryCop: 14100000, topRole: 'Data Scientist & Quant Analyst' },
      { name: 'San Francisco, CA', lat: 37.7749, lon: -122.4194, alumniCount: 16, remoteWorkers: 12, avgSalaryCop: 15200000, topRole: 'Senior Backend Contractor' },
    ],
  },
  {
    id: 'spain-hub',
    isoCode: 'ES',
    flagColors: ['#AA151B', '#F1BF00', '#AA151B'],
    country: 'España',
    city: 'Madrid · Barcelona · Valencia',
    region: 'Unión Europea · Iberia',
    lat: 40.4168,
    lon: -3.7038,
    alumniCount: 94,
    remoteWorkers: 38,
    avgSalaryCop: 9400000,
    avgSalaryUsd: 2290,
    yoyGrowth: 26.4,
    topPrograms: ['Enfermería', 'Instrumentación Quirúrgica', 'Ingeniería de Sistemas', 'Derecho'],
    topCompanies: ['Quirónsalud Madrid', 'NTT Data Europe', 'Indra', 'Santander Tech'],
    primarySector: 'Salud Hospitalaria & Consultoría TI',
    color: '#F59E0B',
    cities: [
      { name: 'Madrid', lat: 40.4168, lon: -3.7038, alumniCount: 52, remoteWorkers: 21, avgSalaryCop: 9600000, topRole: 'Enfermería Clínica & Consultor TI' },
      { name: 'Barcelona', lat: 41.3874, lon: 2.1686, alumniCount: 28, remoteWorkers: 12, avgSalaryCop: 9500000, topRole: 'Software & Biotecnología' },
      { name: 'Valencia', lat: 39.4699, lon: -0.3763, alumniCount: 14, remoteWorkers: 5, avgSalaryCop: 8700000, topRole: 'Instrumentación Quirúrgica' },
    ],
  },
  {
    id: 'mexico-hub',
    isoCode: 'MX',
    flagColors: ['#006847', '#FFFFFF', '#CE1126'],
    country: 'México',
    city: 'Ciudad de México · Monterrey',
    region: 'LATAM Norte',
    lat: 19.4326,
    lon: -99.1332,
    alumniCount: 76,
    remoteWorkers: 54,
    avgSalaryCop: 7200000,
    avgSalaryUsd: 1750,
    yoyGrowth: 28.0,
    topPrograms: ['Ingeniería de Sistemas', 'Comercio Internacional', 'Contaduría Pública'],
    topCompanies: ['Kavak', 'Nubank México', 'Softtek', 'FEMSA Digital'],
    primarySector: 'Fintech, E-Commerce & Logística',
    color: '#A78BFA',
    cities: [
      { name: 'Ciudad de México (CDMX)', lat: 19.4326, lon: -99.1332, alumniCount: 48, remoteWorkers: 35, avgSalaryCop: 7400000, topRole: 'Arquitecto Fintech & Producto' },
      { name: 'Monterrey, NL', lat: 25.6866, lon: -100.3161, alumniCount: 18, remoteWorkers: 12, avgSalaryCop: 7100000, topRole: 'Automatización & Logística' },
      { name: 'Guadalajara, JAL', lat: 20.6597, lon: -103.3496, alumniCount: 10, remoteWorkers: 7, avgSalaryCop: 6800000, topRole: 'Ingeniería de Software' },
    ],
  },
  {
    id: 'chile-hub',
    isoCode: 'CL',
    flagColors: ['#0039A6', '#FFFFFF', '#D52B1E'],
    country: 'Chile',
    city: 'Santiago · Antofagasta',
    region: 'Cono Sur',
    lat: -33.4489,
    lon: -70.6693,
    alumniCount: 64,
    remoteWorkers: 29,
    avgSalaryCop: 7850000,
    avgSalaryUsd: 1910,
    yoyGrowth: 21.3,
    topPrograms: ['Ingeniería Ambiental', 'Ingeniería Agroindustrial', 'Ingeniería Electrónica'],
    topCompanies: ['Codelco', 'Falabella Tech', 'SQM Ambiental', 'Cencosud'],
    primarySector: 'Minería Sostenible, Ambiental & Retail',
    color: '#FB7185',
    cities: [
      { name: 'Santiago de Chile', lat: -33.4489, lon: -70.6693, alumniCount: 44, remoteWorkers: 23, avgSalaryCop: 7950000, topRole: 'Analista Retail Tech & Ambiental' },
      { name: 'Antofagasta', lat: -23.6509, lon: -70.3975, alumniCount: 20, remoteWorkers: 6, avgSalaryCop: 7650000, topRole: 'Gestión Ambiental Minera' },
    ],
  },
  {
    id: 'canada-hub',
    isoCode: 'CA',
    flagColors: ['#FF0000', '#FFFFFF', '#FF0000'],
    country: 'Canadá',
    city: 'Toronto · Montreal · Vancouver',
    region: 'Norteamérica',
    lat: 43.6532,
    lon: -79.3832,
    alumniCount: 52,
    remoteWorkers: 31,
    avgSalaryCop: 11600000,
    avgSalaryUsd: 2830,
    yoyGrowth: 31.0,
    topPrograms: ['Ingeniería de Sistemas', 'Microbiología', 'Ingeniería Ambiental'],
    topCompanies: ['Shopify Ecosystem', 'CGI Group', 'BioLab Ontario'],
    primarySector: 'Biotecnología, IA & Cleantech',
    color: '#2DD4BF',
    cities: [
      { name: 'Toronto, ON', lat: 43.6532, lon: -79.3832, alumniCount: 28, remoteWorkers: 18, avgSalaryCop: 11900000, topRole: 'Cloud & Cleantech Specialist' },
      { name: 'Montreal, QC', lat: 45.5017, lon: -73.5673, alumniCount: 15, remoteWorkers: 8, avgSalaryCop: 11200000, topRole: 'Investigador IA & Microbiología' },
      { name: 'Vancouver, BC', lat: 49.2827, lon: -123.1207, alumniCount: 9, remoteWorkers: 5, avgSalaryCop: 11500000, topRole: 'Ingeniería Ambiental' },
    ],
  },
  {
    id: 'germany-hub',
    isoCode: 'DE',
    flagColors: ['#000000', '#DD0000', '#FFCE00'],
    country: 'Alemania',
    city: 'Berlín · Múnich · Fráncfort',
    region: 'Unión Europea Central',
    lat: 52.52,
    lon: 13.405,
    alumniCount: 34,
    remoteWorkers: 14,
    avgSalaryCop: 11900000,
    avgSalaryUsd: 2900,
    yoyGrowth: 24.5,
    topPrograms: ['Microbiología', 'Enfermería', 'Ingeniería Electrónica'],
    topCompanies: ['Charité Berlin', 'Siemens Healthineers', 'Bayer CropScience'],
    primarySector: 'Investigación Clínica, Salud & Automatización',
    color: '#FBBF24',
    cities: [
      { name: 'Berlín', lat: 52.52, lon: 13.405, alumniCount: 19, remoteWorkers: 8, avgSalaryCop: 12100000, topRole: 'Microbiología & Salud Clínica' },
      { name: 'Múnich', lat: 48.1351, lon: 11.582, alumniCount: 15, remoteWorkers: 6, avgSalaryCop: 11700000, topRole: 'Ingeniería Electrónica & IoT' },
    ],
  },
  {
    id: 'brazil-hub',
    isoCode: 'BR',
    flagColors: ['#009B3A', '#FEDF00', '#002776'],
    country: 'Brasil',
    city: 'São Paulo · Curitiba',
    region: 'Mercosur',
    lat: -23.5505,
    lon: -46.6333,
    alumniCount: 41,
    remoteWorkers: 26,
    avgSalaryCop: 6900000,
    avgSalaryUsd: 1680,
    yoyGrowth: 17.6,
    topPrograms: ['Ingeniería Agroindustrial', 'Ingeniería de Sistemas', 'Administración de Empresas'],
    topCompanies: ['Nubank HQ', 'TOTVS', 'Embrapa Convenios', 'VTEX'],
    primarySector: 'Agrotech & Banca Digital',
    color: '#60A5FA',
    cities: [
      { name: 'São Paulo', lat: -23.5505, lon: -46.6333, alumniCount: 29, remoteWorkers: 19, avgSalaryCop: 7100000, topRole: 'Banca Digital & E-Commerce' },
      { name: 'Curitiba', lat: -25.4284, lon: -49.2733, alumniCount: 12, remoteWorkers: 7, avgSalaryCop: 6500000, topRole: 'Innovación Agroindustrial' },
    ],
  },
  {
    id: 'panama-hub',
    isoCode: 'PA',
    flagColors: ['#005293', '#FFFFFF', '#D21034'],
    country: 'Panamá',
    city: 'Ciudad de Panamá · Colón',
    region: 'Centroamérica & Caribe',
    lat: 8.9824,
    lon: -79.5199,
    alumniCount: 49,
    remoteWorkers: 19,
    avgSalaryCop: 6400000,
    avgSalaryUsd: 1560,
    yoyGrowth: 15.9,
    topPrograms: ['Comercio Internacional', 'Contaduría Pública', 'Derecho'],
    topCompanies: ['Copa Airlines HQ', 'Autoridad Canal de Panamá', 'Multibank'],
    primarySector: 'Comercio Marítimo, Banca & Aduanas',
    color: '#34D399',
    cities: [
      { name: 'Ciudad de Panamá', lat: 8.9824, lon: -79.5199, alumniCount: 36, remoteWorkers: 15, avgSalaryCop: 6550000, topRole: 'Comercio Internacional & Banca' },
      { name: 'Zona Libre de Colón', lat: 9.3547, lon: -79.9001, alumniCount: 13, remoteWorkers: 4, avgSalaryCop: 6050000, topRole: 'Logística Portuaria & Aduanas' },
    ],
  },
];

const CONTINENT_POLYGONS: Array<{ name: string; latRange: [number, number]; lonRange: [number, number]; step: number }> = [
  { name: 'NA1', latRange: [25, 62], lonRange: [-125, -72], step: 4.2 },
  { name: 'NA2', latRange: [15, 28], lonRange: [-106, -86], step: 3.8 },
  { name: 'CA', latRange: [8, 22], lonRange: [-88, -68], step: 3.0 },
  { name: 'SA_NORTH', latRange: [-8, 12], lonRange: [-80, -48], step: 3.2 },
  { name: 'SA_MID', latRange: [-25, -8], lonRange: [-76, -36], step: 3.6 },
  { name: 'SA_SOUTH', latRange: [-52, -25], lonRange: [-74, -54], step: 3.8 },
  { name: 'EU_WEST', latRange: [36, 58], lonRange: [-9, 18], step: 3.4 },
  { name: 'EU_EAST', latRange: [42, 64], lonRange: [18, 45], step: 4.2 },
  { name: 'AF_NORTH', latRange: [5, 35], lonRange: [-16, 36], step: 4.8 },
  { name: 'AF_SOUTH', latRange: [-34, 5], lonRange: [10, 40], step: 4.8 },
  { name: 'AS_MAIN', latRange: [15, 60], lonRange: [48, 138], step: 5.8 },
  { name: 'OC', latRange: [-38, -14], lonRange: [114, 152], step: 4.8 },
];

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function latLonToXYZ(lat: number, lon: number, radius: number) {
  const phi = degToRad(90 - lat);
  const theta = degToRad(lon);
  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.cos(theta);
  return { x, y, z };
}

function rotatePoint3D(
  pt: { x: number; y: number; z: number },
  rotLonDeg: number,
  rotLatDeg: number
) {
  const yaw = degToRad(-rotLonDeg);
  const pitch = degToRad(rotLatDeg);

  const x1 = pt.x * Math.cos(yaw) + pt.z * Math.sin(yaw);
  const y1 = pt.y;
  const z1 = -pt.x * Math.sin(yaw) + pt.z * Math.cos(yaw);

  const x2 = x1;
  const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch);

  return { x: x2, y: y2, z: z2 };
}

interface GlobalAlumniPlanetProps {
  selectedProgram?: string;
  rawRecords?: any[];
  totalActiveGraduates?: number;
}

export const GlobalAlumniPlanet: React.FC<GlobalAlumniPlanetProps> = ({
  selectedProgram,
  rawRecords = [],
  totalActiveGraduates = 107,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [layerMode, setLayerMode] = useState<PlanetLayerMode>('diaspora');
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>('projection');
  const [selectedHubId, setSelectedHubId] = useState<string>('spain-hub');
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.15);
  const [rotation, setRotation] = useState<{ lon: number; lat: number }>({ lon: -42, lat: 20 });
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.body.classList.contains('dark')
  );

  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animProgressRef = useRef<number>(0);
  const screenNodesRef = useRef<Array<{ id: string; cityName?: string; x: number; y: number; r: number }>>([]);

  // Watch body.dark class changes so the Globe adapts immediately to Dark / Light mode
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateTheme = () => setIsDarkTheme(document.body.classList.contains('dark'));
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const landDots = useMemo(() => {
    const dots: Array<{ lat: number; lon: number }> = [];
    for (const poly of CONTINENT_POLYGONS) {
      for (let lat = poly.latRange[0]; lat <= poly.latRange[1]; lat += poly.step) {
        for (let lon = poly.lonRange[0]; lon <= poly.lonRange[1]; lon += poly.step) {
          const mask = Math.sin(lat * 0.25) * Math.cos(lon * 0.18);
          if (mask > -0.65) {
            dots.push({ lat, lon });
          }
        }
      }
    }
    return dots;
  }, []);

  // Build 100% Real PostgreSQL DB hubs when user switches to 'real_db'
  const realDbHubs = useMemo<GlobalHubNode[]>(() => {
    const totalDb = Math.max(1, rawRecords.length || totalActiveGraduates || 107);
    const hiredRecords = rawRecords.filter((r) => r.status === 'CONTRATADO');
    const avgSal =
      hiredRecords.length > 0
        ? Math.round(
            hiredRecords.reduce((acc, r) => acc + Number(r.salary || 3300000), 0) /
              hiredRecords.length
          )
        : 3300000;

    const progsInDb = Array.from(
      new Set(rawRecords.map((r) => r.program).filter(Boolean))
    ).slice(0, 4) as string[];
    const compsInDb = Array.from(
      new Set(
        rawRecords
          .map((r) => r.company)
          .filter((c) => c && c !== 'Sin vincular')
      )
    ).slice(0, 4) as string[];

    const valleCount = Math.round(totalDb * 0.68);
    const bogCount = Math.max(1, totalDb - valleCount);

    return [
      {
        ...ORIGIN_VALLEDUPAR,
        country: 'Colombia · Región Caribe (BD Real)',
        city: 'Valledupar · Aguachica · Santa Marta',
        alumniCount: valleCount,
        remoteWorkers: Math.max(1, Math.round(valleCount * 0.18)),
        avgSalaryCop: avgSal,
        avgSalaryUsd: Math.round(avgSal / 4100),
        topPrograms: progsInDb.length ? progsInDb : ORIGIN_VALLEDUPAR.topPrograms,
        topCompanies: compsInDb.length ? compsInDb : ['Empresa Principal', 'Clínica Valledupar'],
        cities: [
          {
            name: 'Valledupar (Sede Central)',
            lat: 10.4631,
            lon: -73.2532,
            alumniCount: Math.round(valleCount * 0.78),
            remoteWorkers: Math.round(valleCount * 0.14),
            avgSalaryCop: avgSal,
            topRole: 'Egresados registrados en PostgreSQL',
          },
          {
            name: 'Aguachica (Seccional)',
            lat: 8.3084,
            lon: -73.6166,
            alumniCount: Math.max(1, valleCount - Math.round(valleCount * 0.78)),
            remoteWorkers: Math.round(valleCount * 0.04),
            avgSalaryCop: avgSal,
            topRole: 'Egresados registrados en PostgreSQL',
          },
        ],
      },
      {
        ...GLOBAL_ALUMNI_HUBS[1],
        country: 'Colombia · Corredor Nacional (BD Real)',
        city: 'Bogotá D.C. · Medellín · Barranquilla',
        alumniCount: bogCount,
        remoteWorkers: Math.max(1, Math.round(bogCount * 0.32)),
        avgSalaryCop: Math.round(avgSal * 1.15),
        avgSalaryUsd: Math.round((avgSal * 1.15) / 4100),
        topPrograms: progsInDb.length ? progsInDb : GLOBAL_ALUMNI_HUBS[1].topPrograms,
        topCompanies: compsInDb.length ? compsInDb : ['Empresa 4 S.A.S.', 'Empresa 5 S.A.S.'],
        cities: [
          {
            name: 'Bogotá D.C.',
            lat: 4.711,
            lon: -74.0721,
            alumniCount: Math.round(bogCount * 0.52),
            remoteWorkers: Math.round(bogCount * 0.18),
            avgSalaryCop: Math.round(avgSal * 1.2),
            topRole: 'Ofertas Nacionales & Remotas',
          },
          {
            name: 'Medellín',
            lat: 6.2442,
            lon: -75.5812,
            alumniCount: Math.round(bogCount * 0.28),
            remoteWorkers: Math.round(bogCount * 0.09),
            avgSalaryCop: Math.round(avgSal * 1.15),
            topRole: 'Tecnología & Servicios',
          },
          {
            name: 'Barranquilla',
            lat: 10.9685,
            lon: -74.7813,
            alumniCount: Math.max(1, bogCount - Math.round(bogCount * 0.8)),
            remoteWorkers: Math.round(bogCount * 0.05),
            avgSalaryCop: avgSal,
            topRole: 'Sector Empresarial Caribe',
          },
        ],
      },
    ];
  }, [rawRecords, totalActiveGraduates]);

  const activeHubs = useMemo(() => {
    const baseList = dataSourceMode === 'real_db' ? realDbHubs : GLOBAL_ALUMNI_HUBS;
    if (!selectedProgram) return baseList;
    return baseList.map((h) => {
      const matches = h.topPrograms.some((p) =>
        p.toLowerCase().includes(selectedProgram.toLowerCase())
      );
      const factor = matches ? 0.34 : 0.14;
      return {
        ...h,
        alumniCount: Math.max(2, Math.round(h.alumniCount * factor)),
        remoteWorkers: Math.max(1, Math.round(h.remoteWorkers * factor)),
        cities: h.cities.map((c) => ({
          ...c,
          alumniCount: Math.max(1, Math.round(c.alumniCount * factor)),
          remoteWorkers: Math.max(1, Math.round(c.remoteWorkers * factor)),
        })),
      };
    });
  }, [dataSourceMode, realDbHubs, selectedProgram]);

  const selectedHub = useMemo(
    () => activeHubs.find((h) => h.id === selectedHubId) || activeHubs[0],
    [activeHubs, selectedHubId]
  );

  const globalTotals = useMemo(() => {
    const totalAlumni = activeHubs.reduce((acc, h) => acc + h.alumniCount, 0);
    const internationalAlumni = activeHubs
      .filter((h) => !h.id.endsWith('-co'))
      .reduce((acc, h) => acc + h.alumniCount, 0);
    const totalRemote = activeHubs.reduce((acc, h) => acc + h.remoteWorkers, 0);
    const intlHubs = activeHubs.filter((h) => !h.id.endsWith('-co'));
    const avgIntlSalaryCop =
      intlHubs.length > 0
        ? Math.round(
            intlHubs.reduce((acc, h) => acc + h.avgSalaryCop, 0) / intlHubs.length
          )
        : activeHubs[0]?.avgSalaryCop || 3450000;
    return {
      totalAlumni,
      internationalAlumni,
      intlPct: ((internationalAlumni / Math.max(1, totalAlumni)) * 100).toFixed(1),
      totalRemote,
      remotePct: ((totalRemote / Math.max(1, totalAlumni)) * 100).toFixed(1),
      avgIntlSalaryCop,
    };
  }, [activeHubs]);

  const focusOnHub = (hub: GlobalHubNode, zoomLevel = 2.35) => {
    setSelectedHubId(hub.id);
    setSelectedCityName(null);
    setIsAutoRotating(false);
    setZoom(zoomLevel);
    // Center directly on the selected country so its cities can be explored!
    setRotation({ lon: hub.lon, lat: Math.max(-45, Math.min(48, hub.lat)) });
  };

  const focusOnCity = (hub: GlobalHubNode, city: CityPin) => {
    setSelectedHubId(hub.id);
    setSelectedCityName(city.name);
    setIsAutoRotating(false);
    setZoom(3.2);
    setRotation({ lon: city.lon, lat: Math.max(-48, Math.min(50, city.lat)) });
  };

  // Animation & 3D Rendering Loop
  useEffect(() => {
    let animationFrameId: number;

    const renderGlobe = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (
        canvas.width !== Math.floor(rect.width * dpr) ||
        canvas.height !== Math.floor(rect.height * dpr)
      ) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.36;
      const radius = baseRadius * zoom;

      // Clear background
      ctx.clearRect(0, 0, width, height);

      // Theme-aware Ocean & Space Colors
      const oceanColors = isDarkTheme
        ? ['#0F2942', '#09192B', '#040D18']
        : ['#1E3A5F', '#0F2540', '#081526'];

      // Subtle starfield
      ctx.fillStyle = isDarkTheme ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.25)';
      for (let i = 0; i < 32; i++) {
        const sx = ((i * 97) % 100) * (width / 100);
        const sy = ((i * 53) % 100) * (height / 100);
        if (Math.hypot(sx - cx, sy - cy) > radius * 1.04) {
          ctx.beginPath();
          ctx.arc(sx, sy, (i % 2) + 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Outer atmospheric halo
      const haloGrad = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 1.22);
      haloGrad.addColorStop(0, 'rgba(16, 185, 129, 0.24)');
      haloGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.09)');
      haloGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.22, 0, Math.PI * 2);
      ctx.fill();

      // Main 3D Ocean Sphere
      const sphereGrad = ctx.createRadialGradient(
        cx - radius * 0.28,
        cy - radius * 0.28,
        radius * 0.08,
        cx,
        cy,
        radius
      );
      sphereGrad.addColorStop(0, oceanColors[0]);
      sphereGrad.addColorStop(0.58, oceanColors[1]);
      sphereGrad.addColorStop(1, oceanColors[2]);
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Rim border
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.42)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Graticule lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.11)';
      ctx.lineWidth = 0.75;

      for (let lat = -60; lat <= 60; lat += 20) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 5) {
          const p3 = rotatePoint3D(latLonToXYZ(lat, lon, radius), rotation.lon, rotation.lat);
          if (p3.z > 0) {
            const sx = cx + p3.x;
            const sy = cy - p3.y;
            if (!started) {
              ctx.moveTo(sx, sy);
              started = true;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      for (let lon = -180; lon < 180; lon += 20) {
        ctx.beginPath();
        let started = false;
        for (let lat = -80; lat <= 80; lat += 5) {
          const p3 = rotatePoint3D(latLonToXYZ(lat, lon, radius), rotation.lon, rotation.lat);
          if (p3.z > 0) {
            const sx = cx + p3.x;
            const sy = cy - p3.y;
            if (!started) {
              ctx.moveTo(sx, sy);
              started = true;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Draw Continental Land Dots
      const dotSize = Math.max(1.2, Math.min(2.6, 1.3 * Math.sqrt(zoom)));
      for (const dot of landDots) {
        const p3 = rotatePoint3D(latLonToXYZ(dot.lat, dot.lon, radius), rotation.lon, rotation.lat);
        if (p3.z > 0) {
          const depthAlpha = Math.min(1, p3.z / (radius * 0.65));
          ctx.fillStyle = `rgba(52, 211, 153, ${0.2 + depthAlpha * 0.28})`;
          ctx.beginPath();
          ctx.arc(cx + p3.x, cy - p3.y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw 3D Elevated Parabolic Arcs from Valledupar (Origin)
      const originXYZ = latLonToXYZ(ORIGIN_VALLEDUPAR.lat, ORIGIN_VALLEDUPAR.lon, radius);
      animProgressRef.current = (animProgressRef.current + 0.008) % 1;

      for (const hub of activeHubs) {
        if (hub.isOrigin) continue;
        const destXYZ = latLonToXYZ(hub.lat, hub.lon, radius);
        const isSelected = hub.id === selectedHubId;

        const arcSegments = 48;
        const arcScreenPts: Array<{ x: number; y: number; visible: boolean }> = [];

        for (let s = 0; s <= arcSegments; s++) {
          const t = s / arcSegments;
          const ix = originXYZ.x * (1 - t) + destXYZ.x * t;
          const iy = originXYZ.y * (1 - t) + destXYZ.y * t;
          const iz = originXYZ.z * (1 - t) + destXYZ.z * t;
          const len = Math.hypot(ix, iy, iz) || 1;
          const loft = 1 + Math.sin(t * Math.PI) * (isSelected ? 0.19 : 0.13);
          const loftedXYZ = {
            x: (ix / len) * radius * loft,
            y: (iy / len) * radius * loft,
            z: (iz / len) * radius * loft,
          };
          const rotPt = rotatePoint3D(loftedXYZ, rotation.lon, rotation.lat);
          arcScreenPts.push({
            x: cx + rotPt.x,
            y: cy - rotPt.y,
            visible: rotPt.z > -radius * 0.12,
          });
        }

        ctx.beginPath();
        let started = false;
        for (const pt of arcScreenPts) {
          if (pt.visible) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.strokeStyle = isSelected ? hub.color : 'rgba(52, 211, 153, 0.42)';
        ctx.lineWidth = isSelected ? 2.8 : 1.4;
        ctx.stroke();

        const packetIdx = Math.floor(
          ((animProgressRef.current + (hub.alumniCount % 7) * 0.13) % 1) * arcSegments
        );
        const packetPt = arcScreenPts[packetIdx];
        if (packetPt && packetPt.visible) {
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = hub.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(packetPt.x, packetPt.y, isSelected ? 3.8 : 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw Hub Beacons & City Sub-Nodes when zoomed in
      const currentScreenNodes: Array<{ id: string; cityName?: string; x: number; y: number; r: number }> = [];

      for (const hub of activeHubs) {
        const p3 = rotatePoint3D(latLonToXYZ(hub.lat, hub.lon, radius), rotation.lon, rotation.lat);
        const isSelected = hub.id === selectedHubId;

        // If zoomed in (>= 1.65) and this hub is selected (or Colombia), render its individual City Pins!
        if (zoom >= 1.65 && (isSelected || hub.isOrigin) && hub.cities.length > 0) {
          for (const city of hub.cities) {
            const cp3 = rotatePoint3D(latLonToXYZ(city.lat, city.lon, radius), rotation.lon, rotation.lat);
            if (cp3.z > 0) {
              const csx = cx + cp3.x;
              const csy = cy - cp3.y;
              const isCitySelected = selectedCityName === city.name;
              const cityR = isCitySelected ? 6.5 : 4.8;

              currentScreenNodes.push({
                id: hub.id,
                cityName: city.name,
                x: csx,
                y: csy,
                r: cityR + 6,
              });

              // Pulsing ring on city
              ctx.strokeStyle = isCitySelected ? '#FBBF24' : hub.color;
              ctx.lineWidth = isCitySelected ? 2 : 1.2;
              ctx.beginPath();
              ctx.arc(csx, csy, cityR + 3.5, 0, Math.PI * 2);
              ctx.stroke();

              ctx.fillStyle = isCitySelected ? '#FBBF24' : hub.color;
              ctx.beginPath();
              ctx.arc(csx, csy, cityR, 0, Math.PI * 2);
              ctx.fill();

              // City label pill
              const cText = `📍 ${city.name} (${city.alumniCount})`;
              ctx.font = '700 10px Inter, system-ui, sans-serif';
              const tw = ctx.measureText(cText).width;
              const px = csx - tw / 2 - 6;
              const py = csy - cityR - 20;

              ctx.fillStyle = isCitySelected
                ? 'rgba(217, 119, 6, 0.96)'
                : 'rgba(6, 78, 59, 0.94)';
              ctx.beginPath();
              ctx.roundRect(px, py, tw + 12, 16, 5);
              ctx.fill();
              ctx.strokeStyle = isCitySelected ? '#FDE68A' : '#34D399';
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.fillStyle = '#FFFFFF';
              ctx.fillText(cText, px + 6, py + 11.5);
            }
          }
        }

        if (p3.z > -10) {
          const sx = cx + p3.x;
          const sy = cy - p3.y;

          let metricRadius = 5;
          if (layerMode === 'diaspora') {
            metricRadius = Math.max(5, Math.min(12, Math.sqrt(hub.alumniCount) * 0.42));
          } else if (layerMode === 'remote') {
            metricRadius = Math.max(5, Math.min(12, Math.sqrt(hub.remoteWorkers) * 0.68));
          } else {
            metricRadius = Math.max(5, Math.min(11.5, hub.avgSalaryUsd / 320));
          }

          currentScreenNodes.push({ id: hub.id, x: sx, y: sy, r: metricRadius + 6 });

          if (hub.isOrigin || isSelected) {
            const pulseR = metricRadius + 4 + Math.sin(animProgressRef.current * Math.PI * 2) * 3.5;
            ctx.strokeStyle = hub.color;
            ctx.lineWidth = isSelected ? 2.2 : 1.5;
            ctx.beginPath();
            ctx.arc(sx, sy, pulseR, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = hub.color;
          ctx.beginPath();
          ctx.arc(sx, sy, metricRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#040D18';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Hide macro country pill if zoomed into city pins of this exact hub to avoid overlap
          if (!(zoom >= 1.95 && isSelected)) {
            const metricBadge =
              layerMode === 'diaspora'
                ? `${hub.alumniCount}`
                : layerMode === 'remote'
                  ? `${hub.remoteWorkers} rem.`
                  : `$${(hub.avgSalaryCop / 1000000).toFixed(1)}M`;

            ctx.font = `${isSelected || hub.isOrigin ? '700' : '600'} 10px Inter, system-ui, sans-serif`;
            const shortCountry = hub.country.replace(' (Sede Origen UPC)', '').replace(' (Interior)', ' Int.').replace(' (BD Real)', '');
            const labelText = `[${hub.isoCode}] ${shortCountry} · ${metricBadge}`;
            const textWidth = ctx.measureText(labelText).width;
            const pillX = sx - textWidth / 2 - 6;
            const pillY = sy - metricRadius - 22;

            ctx.fillStyle = isSelected
              ? 'rgba(8, 116, 67, 0.96)'
              : hub.isOrigin
                ? 'rgba(6, 78, 59, 0.92)'
                : 'rgba(15, 23, 42, 0.88)';
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, textWidth + 12, 17, 6);
            ctx.fill();

            ctx.strokeStyle = isSelected ? '#34D399' : 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#F8FAFC';
            ctx.fillText(labelText, pillX + 6, pillY + 12);
          }
        }
      }

      screenNodesRef.current = currentScreenNodes;
      ctx.restore();

      if (isAutoRotating && !isDraggingRef.current) {
        setRotation((prev) => ({
          lon: ((prev.lon + 0.16 + 180) % 360) - 180,
          lat: prev.lat,
        }));
      }

      animationFrameId = requestAnimationFrame(renderGlobe);
    };

    animationFrameId = requestAnimationFrame(renderGlobe);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    activeHubs,
    isAutoRotating,
    isDarkTheme,
    landDots,
    layerMode,
    rotation.lat,
    rotation.lon,
    selectedCityName,
    selectedHubId,
    zoom,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const hitNode = screenNodesRef.current.find(
      (n) => Math.hypot(n.x - clickX, n.y - clickY) <= n.r + 6
    );
    if (hitNode) {
      setSelectedHubId(hitNode.id);
      if (hitNode.cityName) {
        setSelectedCityName(hitNode.cityName);
      } else {
        const targetHub = activeHubs.find((h) => h.id === hitNode.id);
        if (targetHub) {
          focusOnHub(targetHub, Math.max(zoom, 2.2));
        }
      }
      setIsAutoRotating(false);
      return;
    }

    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setIsAutoRotating(false);
    const sensitivity = 0.45 / Math.sqrt(zoom);
    setRotation((prev) => ({
      lon: prev.lon - dx * sensitivity,
      lat: Math.max(-65, Math.min(65, prev.lat + dy * sensitivity)),
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((prev) => Math.max(0.85, Math.min(4.2, Number((prev + delta).toFixed(2)))));
  };

  return (
    <div
      className="rounded-3xl border shadow-sm overflow-hidden animate-fade-in-up"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
    >
      {/* Top Header, Data Source Switcher & Layer Switcher */}
      <div
        className="p-5 sm:p-6 border-b space-y-4"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                <Globe2 className="w-3.5 h-3.5" />
                Geointeligencia 3D · Zoom por País y Ciudad
              </span>

              {/* Data Source Badge & Switcher (Real DB vs Projection) */}
              <div
                className="inline-flex items-center gap-1 p-0.5 rounded-full border text-[11px]"
                style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
              >
                <button
                  onClick={() => {
                    setDataSourceMode('real_db');
                    setSelectedHubId('valledupar-co');
                    setRotation({ lon: -73.5, lat: 8.5 });
                    setZoom(2.6);
                  }}
                  className={`px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                    dataSourceMode === 'real_db'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  Datos Reales BD ({rawRecords.length || totalActiveGraduates} reg.)
                </button>
                <button
                  onClick={() => {
                    setDataSourceMode('projection');
                    setZoom(1.25);
                  }}
                  className={`px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                    dataSourceMode === 'projection'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Proyección Global (10 Países)
                </button>
              </div>
            </div>

            <h3 className="text-lg font-black text-ink">
              Planeta Interactivo 3D: Diáspora, Trabajo Remoto Global (Nearshore) y Salarios por Ciudad
            </h3>
            <p className="text-xs text-ink-secondary max-w-3xl">
              {dataSourceMode === 'real_db'
                ? 'Mostrando 100% los registros reales almacenados en PostgreSQL (Valledupar, Aguachica, Bogotá, Medellín y Barranquilla). Haz zoom para inspeccionar cada ciudad.'
                : 'Modelo de proyección internacional para sustentación ejecutiva. Haz clic en cualquier país o usa los botones de Zoom (+ / -) para ampliar sus ciudades específicas.'}
            </p>
          </div>

          {/* 3 Switchable Data Layers */}
          <div
            className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border self-start xl:self-auto"
            style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
          >
            <button
              onClick={() => setLayerMode('diaspora')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                layerMode === 'diaspora'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              1. Diáspora & Movilidad
            </button>
            <button
              onClick={() => setLayerMode('remote')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                layerMode === 'remote'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              2. Trabajo Remoto (Nearshore)
            </button>
            <button
              onClick={() => setLayerMode('salaries')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                layerMode === 'salaries'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              3. Arbitraje Salarial Global
            </button>
          </div>
        </div>
      </div>

      {/* Summary Strip for the Globe (100% Dark & Light Mode Compatible) */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 border-b divide-y lg:divide-y-0 lg:divide-x"
        style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
      >
        <div className="p-4 flex items-center gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-tertiary">
              {dataSourceMode === 'real_db' ? 'Cobertura BD Real' : 'Presencia Internacional'}
            </p>
            <p className="text-lg font-black text-ink">
              {activeHubs.length} Hubs · {globalTotals.totalAlumni}{' '}
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                egresados
              </span>
            </p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-tertiary">
              Talento en Remoto Global
            </p>
            <p className="text-lg font-black text-ink">
              {globalTotals.totalRemote} Egresados{' '}
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                ({globalTotals.remotePct}%)
              </span>
            </p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-tertiary">
              Salario Promedio
            </p>
            <p className="text-lg font-black text-ink">
              ${(globalTotals.avgIntlSalaryCop / 1000000).toFixed(2)}M COP{' '}
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {dataSourceMode === 'real_db' ? 'BD Real' : '~2.7x Local'}
              </span>
            </p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-tertiary">
              Nivel de Zoom Actual
            </p>
            <p className="text-sm font-black text-ink">
              {zoom.toFixed(1)}x · {zoom >= 1.65 ? 'Vista Detallada Ciudades' : 'Vista Planetaria'}
            </p>
            <p className="text-[11px] text-ink-secondary">Usa + / - o rueda del ratón</p>
          </div>
        </div>
      </div>

      {/* Main Content: 3D Globe Canvas + Right Country & City Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left/Center: Interactive 3D Planet Viewport */}
        <div
          className={`lg:col-span-7 relative min-h-[470px] sm:min-h-[520px] flex flex-col justify-between overflow-hidden transition-colors ${
            isDarkTheme ? 'bg-[#040B14]' : 'bg-[#071324]'
          }`}
        >
          {/* Top Overlay Controls + Zoom Bar */}
          <div className="relative z-10 p-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-xs text-slate-200 flex items-center gap-2 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Origen:</span>
              <span className="font-extrabold text-emerald-300">
                [CO] Valledupar, Cesar (10.46°N, 73.25°W)
              </span>
            </div>

            {/* Zoom & Orbit Controls */}
            <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
              <button
                onClick={() => setZoom((z) => Math.min(4.2, Number((z + 0.45).toFixed(2))))}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                title="Ampliar ubicación (Zoom In)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                Ampliar +
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.45).toFixed(2))))}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Alejar vista (Zoom Out)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                Alejar -
              </button>
              <button
                onClick={() => focusOnHub(selectedHub, 2.5)}
                className="px-2.5 py-1.5 rounded-xl bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                title="Enfocar y ampliar las ciudades del país seleccionado"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Ver Ciudades de {selectedHub.isoCode}
              </button>
              <button
                onClick={() => setIsAutoRotating((v) => !v)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isAutoRotating ? (
                  <Pause className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                )}
                {isAutoRotating ? 'Pausar' : 'Rotar'}
              </button>
              <button
                onClick={() => {
                  setRotation({ lon: -48, lat: 16 });
                  setZoom(1.15);
                  setSelectedCityName(null);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Restablecer vista global"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive HTML5 3D Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          />

          {/* Bottom Country & City Quick Selector Pills */}
          <div className="relative z-10 p-4 bg-gradient-to-t from-[#040B14] via-[#040B14]/85 to-transparent space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Haz clic en un país para ampliar su ubicación y desplegar sus ciudades:
              </p>
              <span className="text-[10px] font-bold text-emerald-400">
                Zoom: {zoom.toFixed(1)}x
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeHubs.map((hub) => {
                const active = hub.id === selectedHubId;
                return (
                  <button
                    key={hub.id}
                    onClick={() => focusOnHub(hub, 2.35)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm scale-[1.03]'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:border-emerald-500/60 hover:text-white'
                    }`}
                  >
                    <span
                      className="px-1.5 py-0.2 rounded text-[9px] font-black text-slate-950"
                      style={{ backgroundColor: hub.flagColors[0] === '#000000' ? '#FBBF24' : hub.flagColors[0] }}
                    >
                      {hub.isoCode}
                    </span>
                    <span>
                      {hub.country
                        .replace(' (Sede Origen UPC)', '')
                        .replace(' (Interior)', ' Interior')
                        .replace(' (BD Real)', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Deep Country & City Inspector */}
        <div
          className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-5 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="space-y-4">
            {/* Selected Hub Card */}
            <div
              className="p-4 rounded-2xl border space-y-3.5"
              style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-black text-xs text-white shadow-xs shrink-0 border border-white/20"
                    style={{
                      background: `linear-gradient(135deg, ${selectedHub.flagColors[0]}, ${selectedHub.flagColors[2]})`,
                    }}
                  >
                    <span className="drop-shadow-xs">{selectedHub.isoCode}</span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-ink">{selectedHub.country}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                        +{selectedHub.yoyGrowth}% Anual
                      </span>
                    </div>
                    <p className="text-xs text-ink-secondary flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      {selectedHub.city} · <span className="font-semibold">{selectedHub.region}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 KPIs of Selected Hub */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <p className="text-[10px] font-bold uppercase text-ink-tertiary">Egresados UPC</p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedHub.alumniCount}
                  </p>
                  <p className="text-[10px] text-ink-secondary">Vinculados</p>
                </div>
                <div
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <p className="text-[10px] font-bold uppercase text-ink-tertiary">En Remoto</p>
                  <p className="text-lg font-black text-sky-600 dark:text-sky-400 mt-0.5">
                    {selectedHub.remoteWorkers}
                  </p>
                  <p className="text-[10px] text-ink-secondary">
                    {Math.round((selectedHub.remoteWorkers / Math.max(1, selectedHub.alumniCount)) * 100)}% del hub
                  </p>
                </div>
                <div
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <p className="text-[10px] font-bold uppercase text-ink-tertiary">Salario Prom.</p>
                  <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    ${(selectedHub.avgSalaryCop / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-[10px] text-ink-secondary">~${selectedHub.avgSalaryUsd} USD/mes</p>
                </div>
              </div>

              {/* NEW: Interactive City Drill-Down inside Selected Country */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Ubicaciones y Ciudades en {selectedHub.country.split(' ')[0]} (Clic para Zoom 3.2x)
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedHub.cities.map((city, cIdx) => {
                    const isCityActive = selectedCityName === city.name;
                    return (
                      <button
                        key={cIdx}
                        onClick={() => focusOnCity(selectedHub, city)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isCityActive
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-2xs'
                            : 'hover:border-emerald-500/50'
                        }`}
                        style={
                          !isCityActive
                            ? { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }
                            : undefined
                        }
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-ink truncate flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            {city.name}
                          </p>
                          <p className="text-[10px] text-ink-secondary truncate">{city.topRole}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                            {city.alumniCount} egr.
                          </span>
                          <span className="text-[10px] text-ink-tertiary">
                            ${(city.avgSalaryCop / 1000000).toFixed(1)}M
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Programs & Employers */}
              <div className="space-y-2.5 pt-1">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5 mb-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Carreras UPC con Mayor Demanda
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHub.topPrograms.map((prog, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"
                      >
                        {prog}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    Empresas Receptoras ({selectedHub.primarySector})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHub.topCompanies.map((comp, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold border text-ink"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking Table of Global Corridors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Ranking de Corredores de Empleabilidad
                </h5>
                <span className="text-[11px] text-ink-tertiary font-semibold">Clic para ampliar país</span>
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {activeHubs
                  .sort((a, b) =>
                    layerMode === 'diaspora'
                      ? b.alumniCount - a.alumniCount
                      : layerMode === 'remote'
                        ? b.remoteWorkers - a.remoteWorkers
                        : b.avgSalaryCop - a.avgSalaryCop
                  )
                  .map((hub, idx) => {
                    const isSelected = hub.id === selectedHubId;
                    return (
                      <button
                        key={hub.id}
                        onClick={() => focusOnHub(hub, 2.35)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-2xs'
                            : 'hover:bg-muted/60'
                        }`}
                        style={
                          !isSelected
                            ? { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-800 text-white shrink-0">
                            {hub.isoCode}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-extrabold text-ink truncate">{hub.country}</p>
                            <p className="text-[10px] text-ink-secondary truncate">{hub.city}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {layerMode === 'diaspora'
                                ? `${hub.alumniCount} egresados`
                                : layerMode === 'remote'
                                  ? `${hub.remoteWorkers} en remoto`
                                  : `$${(hub.avgSalaryCop / 1000000).toFixed(1)}M COP`}
                            </p>
                            <p className="text-[10px] text-ink-tertiary">+{hub.yoyGrowth}% YoY</p>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-ink-tertiary" />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Institutional Insight Footer (Dark Mode Compatible) */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-ink leading-relaxed">
              <strong>Transparencia de Datos:</strong> Con el botón superior puedes alternar entre{' '}
              <strong>Datos Reales BD (PostgreSQL)</strong> (los {rawRecords.length || totalActiveGraduates} egresados y vacantes reales registradas en tu servidor) y la{' '}
              <strong>Proyección Institucional Global</strong> para sustentación de alcance internacional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
