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
} from 'lucide-react';

export type PlanetLayerMode = 'diaspora' | 'remote' | 'salaries';

export interface GlobalHubNode {
  id: string;
  country: string;
  city: string;
  flag: string;
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
}

const ORIGIN_VALLEDUPAR: GlobalHubNode = {
  id: 'valledupar-co',
  country: 'Colombia (Sede Origen UPC)',
  city: 'Valledupar · Cesar & Caribe',
  flag: '🇨🇴',
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
};

export const GLOBAL_ALUMNI_HUBS: GlobalHubNode[] = [
  ORIGIN_VALLEDUPAR,
  {
    id: 'bogota-medellin-co',
    country: 'Colombia (Interior)',
    city: 'Bogotá D.C. · Medellín · Barranquilla',
    flag: '🇨🇴',
    region: 'Corredor Nacional Andino',
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
  },
  {
    id: 'usa-hub',
    country: 'Estados Unidos',
    city: 'Miami · Austin · Nueva York',
    flag: '🇺🇸',
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
  },
  {
    id: 'spain-hub',
    country: 'España',
    city: 'Madrid · Barcelona · Valencia',
    flag: '🇪🇸',
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
  },
  {
    id: 'mexico-hub',
    country: 'México',
    city: 'Ciudad de México · Monterrey',
    flag: '🇲🇽',
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
  },
  {
    id: 'chile-hub',
    country: 'Chile',
    city: 'Santiago · Antofagasta',
    flag: '🇨🇱',
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
  },
  {
    id: 'canada-hub',
    country: 'Canadá',
    city: 'Toronto · Montreal · Vancouver',
    flag: '🇨🇦',
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
  },
  {
    id: 'germany-hub',
    country: 'Alemania',
    city: 'Berlín · Múnich · Fráncfort',
    flag: '🇩🇪',
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
  },
  {
    id: 'brazil-hub',
    country: 'Brasil',
    city: 'São Paulo · Curitiba',
    flag: '🇧🇷',
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
  },
  {
    id: 'panama-hub',
    country: 'Panamá',
    city: 'Ciudad de Panamá',
    flag: '🇵🇦',
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
  },
];

// Coordenadas simplificadas de masas continentales para renderizar puntos de tierra en la esfera 3D
const CONTINENT_POLYGONS: Array<{ name: string; latRange: [number, number]; lonRange: [number, number]; step: number }> = [
  // Norteamérica
  { name: 'NA1', latRange: [25, 62], lonRange: [-125, -72], step: 4.5 },
  { name: 'NA2', latRange: [15, 28], lonRange: [-106, -86], step: 4.0 },
  // Centroamérica y Caribe
  { name: 'CA', latRange: [8, 22], lonRange: [-88, -68], step: 3.2 },
  // Sudamérica
  { name: 'SA_NORTH', latRange: [-8, 12], lonRange: [-80, -48], step: 3.5 },
  { name: 'SA_MID', latRange: [-25, -8], lonRange: [-76, -36], step: 3.8 },
  { name: 'SA_SOUTH', latRange: [-52, -25], lonRange: [-74, -54], step: 4.0 },
  // Europa
  { name: 'EU_WEST', latRange: [36, 58], lonRange: [-9, 18], step: 3.6 },
  { name: 'EU_EAST', latRange: [42, 64], lonRange: [18, 45], step: 4.5 },
  // África
  { name: 'AF_NORTH', latRange: [5, 35], lonRange: [-16, 36], step: 5.0 },
  { name: 'AF_SOUTH', latRange: [-34, 5], lonRange: [10, 40], step: 5.0 },
  // Asia
  { name: 'AS_MAIN', latRange: [15, 60], lonRange: [48, 138], step: 6.0 },
  // Oceanía
  { name: 'OC', latRange: [-38, -14], lonRange: [114, 152], step: 5.0 },
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

  // Rotate around Y axis (longitude)
  const x1 = pt.x * Math.cos(yaw) + pt.z * Math.sin(yaw);
  const y1 = pt.y;
  const z1 = -pt.x * Math.sin(yaw) + pt.z * Math.cos(yaw);

  // Rotate around X axis (latitude tilt)
  const x2 = x1;
  const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch);

  return { x: x2, y: y2, z: z2 };
}

interface GlobalAlumniPlanetProps {
  selectedProgram?: string;
}

export const GlobalAlumniPlanet: React.FC<GlobalAlumniPlanetProps> = ({ selectedProgram }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [layerMode, setLayerMode] = useState<PlanetLayerMode>('diaspora');
  const [selectedHubId, setSelectedHubId] = useState<string>('usa-hub');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [rotation, setRotation] = useState<{ lon: number; lat: number }>({ lon: -58, lat: 14 });
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animProgressRef = useRef<number>(0);
  const screenNodesRef = useRef<Array<{ id: string; x: number; y: number; r: number }>>([]);

  // Precompute land dots once
  const landDots = useMemo(() => {
    const dots: Array<{ lat: number; lon: number }> = [];
    for (const poly of CONTINENT_POLYGONS) {
      for (let lat = poly.latRange[0]; lat <= poly.latRange[1]; lat += poly.step) {
        for (let lon = poly.lonRange[0]; lon <= poly.lonRange[1]; lon += poly.step) {
          // Subtle pseudo-random organic mask so continents don't look like rigid rectangles
          const mask = Math.sin(lat * 0.25) * Math.cos(lon * 0.18);
          if (mask > -0.65) {
            dots.push({ lat, lon });
          }
        }
      }
    }
    return dots;
  }, []);

  // Filter or scale hubs slightly if a specific academic program filter is active
  const activeHubs = useMemo(() => {
    if (!selectedProgram) return GLOBAL_ALUMNI_HUBS;
    return GLOBAL_ALUMNI_HUBS.map((h) => {
      const matches = h.topPrograms.some((p) =>
        p.toLowerCase().includes(selectedProgram.toLowerCase())
      );
      const factor = matches ? 0.34 : 0.14;
      return {
        ...h,
        alumniCount: Math.max(4, Math.round(h.alumniCount * factor)),
        remoteWorkers: Math.max(2, Math.round(h.remoteWorkers * factor)),
      };
    });
  }, [selectedProgram]);

  const selectedHub = useMemo(
    () => activeHubs.find((h) => h.id === selectedHubId) || activeHubs[2],
    [activeHubs, selectedHubId]
  );

  const globalTotals = useMemo(() => {
    const totalAlumni = activeHubs.reduce((acc, h) => acc + h.alumniCount, 0);
    const internationalAlumni = activeHubs
      .filter((h) => !h.id.endsWith('-co'))
      .reduce((acc, h) => acc + h.alumniCount, 0);
    const totalRemote = activeHubs.reduce((acc, h) => acc + h.remoteWorkers, 0);
    const avgIntlSalaryCop = Math.round(
      activeHubs
        .filter((h) => !h.id.endsWith('-co'))
        .reduce((acc, h) => acc + h.avgSalaryCop, 0) /
        Math.max(1, activeHubs.filter((h) => !h.id.endsWith('-co')).length)
    );
    return {
      totalAlumni,
      internationalAlumni,
      intlPct: ((internationalAlumni / Math.max(1, totalAlumni)) * 100).toFixed(1),
      totalRemote,
      remotePct: ((totalRemote / Math.max(1, totalAlumni)) * 100).toFixed(1),
      avgIntlSalaryCop,
    };
  }, [activeHubs]);

  const focusOnHub = (hub: GlobalHubNode) => {
    setSelectedHubId(hub.id);
    setIsAutoRotating(false);
    // Center camera halfway between Valledupar and the target hub so the 3D arc is clearly visible
    const targetLon = (hub.lon + ORIGIN_VALLEDUPAR.lon) / 2;
    const targetLat = Math.max(-25, Math.min(35, (hub.lat + ORIGIN_VALLEDUPAR.lat) / 2));
    setRotation({ lon: targetLon, lat: targetLat });
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
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.39;

      // Clear background
      ctx.clearRect(0, 0, width, height);

      // Subtle starfield / ambient particles
      ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
      for (let i = 0; i < 36; i++) {
        const sx = ((i * 97) % 100) * (width / 100);
        const sy = ((i * 53) % 100) * (height / 100);
        const distFromCenter = Math.hypot(sx - cx, sy - cy);
        if (distFromCenter > radius * 1.08) {
          ctx.beginPath();
          ctx.arc(sx, sy, (i % 2) + 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Outer atmospheric halo
      const haloGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.25);
      haloGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
      haloGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.08)');
      haloGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Main 3D Ocean Sphere
      const sphereGrad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      sphereGrad.addColorStop(0, '#0F2942');
      sphereGrad.addColorStop(0.55, '#09192B');
      sphereGrad.addColorStop(1, '#040D18');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Rim border
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.38)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Graticule lines (Parallels & Meridians)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
      ctx.lineWidth = 0.75;

      // Latitudes
      for (let lat = -60; lat <= 60; lat += 20) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 6) {
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

      // Longitudes
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
      for (const dot of landDots) {
        const p3 = rotatePoint3D(latLonToXYZ(dot.lat, dot.lon, radius), rotation.lon, rotation.lat);
        if (p3.z > 0) {
          const depthAlpha = Math.min(1, p3.z / (radius * 0.65));
          ctx.fillStyle = `rgba(52, 211, 153, ${0.18 + depthAlpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(cx + p3.x, cy - p3.y, 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw 3D Elevated Parabolic Arcs from Valledupar (Origin) to each destination Hub
      const originXYZ = latLonToXYZ(ORIGIN_VALLEDUPAR.lat, ORIGIN_VALLEDUPAR.lon, radius);
      animProgressRef.current = (animProgressRef.current + 0.008) % 1;

      for (const hub of activeHubs) {
        if (hub.isOrigin) continue;
        const destXYZ = latLonToXYZ(hub.lat, hub.lon, radius);
        const isSelected = hub.id === selectedHubId;

        const arcSegments = 44;
        const arcScreenPts: Array<{ x: number; y: number; visible: boolean }> = [];

        for (let s = 0; s <= arcSegments; s++) {
          const t = s / arcSegments;
          // Linear interpolation + elevation normal to the sphere surface
          const ix = originXYZ.x * (1 - t) + destXYZ.x * t;
          const iy = originXYZ.y * (1 - t) + destXYZ.y * t;
          const iz = originXYZ.z * (1 - t) + destXYZ.z * t;
          const len = Math.hypot(ix, iy, iz) || 1;
          // Parabolic loft height peaks at t = 0.5
          const loft = 1 + Math.sin(t * Math.PI) * (isSelected ? 0.22 : 0.15);
          const loftedXYZ = {
            x: (ix / len) * radius * loft,
            y: (iy / len) * radius * loft,
            z: (iz / len) * radius * loft,
          };
          const rotPt = rotatePoint3D(loftedXYZ, rotation.lon, rotation.lat);
          arcScreenPts.push({
            x: cx + rotPt.x,
            y: cy - rotPt.y,
            visible: rotPt.z > -radius * 0.15,
          });
        }

        // Draw the arc path
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
        ctx.lineWidth = isSelected ? 2.6 : 1.3;
        ctx.stroke();

        // Draw animated glowing data packet along the arc
        const packetIdx = Math.floor(
          ((animProgressRef.current + (hub.alumniCount % 7) * 0.13) % 1) * arcSegments
        );
        const packetPt = arcScreenPts[packetIdx];
        if (packetPt && packetPt.visible) {
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = hub.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(packetPt.x, packetPt.y, isSelected ? 3.6 : 2.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw Hub Beacons on the Globe Surface
      const currentScreenNodes: Array<{ id: string; x: number; y: number; r: number }> = [];

      for (const hub of activeHubs) {
        const p3 = rotatePoint3D(latLonToXYZ(hub.lat, hub.lon, radius), rotation.lon, rotation.lat);
        if (p3.z > -10) {
          const sx = cx + p3.x;
          const sy = cy - p3.y;
          const isSelected = hub.id === selectedHubId;

          // Size based on active layer metric
          let metricRadius = 5;
          if (layerMode === 'diaspora') {
            metricRadius = Math.max(4.5, Math.min(12, Math.sqrt(hub.alumniCount) * 0.42));
          } else if (layerMode === 'remote') {
            metricRadius = Math.max(4.5, Math.min(12, Math.sqrt(hub.remoteWorkers) * 0.68));
          } else {
            metricRadius = Math.max(5, Math.min(11.5, hub.avgSalaryUsd / 320));
          }

          currentScreenNodes.push({ id: hub.id, x: sx, y: sy, r: metricRadius + 6 });

          // Outer pulsing ring for origin or selected hub
          if (hub.isOrigin || isSelected) {
            const pulseR = metricRadius + 4 + Math.sin(animProgressRef.current * Math.PI * 2) * 3.5;
            ctx.strokeStyle = hub.color;
            ctx.lineWidth = isSelected ? 2 : 1.4;
            ctx.beginPath();
            ctx.arc(sx, sy, pulseR, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Node circle
          ctx.fillStyle = hub.color;
          ctx.beginPath();
          ctx.arc(sx, sy, metricRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#040D18';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Label tag on globe
          const metricBadge =
            layerMode === 'diaspora'
              ? `${hub.alumniCount}`
              : layerMode === 'remote'
                ? `${hub.remoteWorkers} rem.`
                : `$${(hub.avgSalaryCop / 1000000).toFixed(1)}M`;

          ctx.font = `${isSelected || hub.isOrigin ? '700' : '600'} 10px Inter, system-ui, sans-serif`;
          const labelText = `${hub.flag} ${hub.country.split(' ')[0]} · ${metricBadge}`;
          const textWidth = ctx.measureText(labelText).width;
          const pillX = sx - textWidth / 2 - 6;
          const pillY = sy - metricRadius - 22;

          ctx.fillStyle = isSelected
            ? 'rgba(8, 116, 67, 0.95)'
            : hub.isOrigin
              ? 'rgba(6, 78, 59, 0.92)'
              : 'rgba(15, 23, 42, 0.84)';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, textWidth + 12, 17, 6);
          ctx.fill();

          ctx.strokeStyle = isSelected ? '#34D399' : 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#F8FAFC';
          ctx.fillText(labelText, pillX + 6, pillY + 12);
        }
      }

      screenNodesRef.current = currentScreenNodes;
      ctx.restore();

      if (isAutoRotating && !isDraggingRef.current) {
        setRotation((prev) => ({
          lon: ((prev.lon + 0.18 + 180) % 360) - 180,
          lat: prev.lat,
        }));
      }

      animationFrameId = requestAnimationFrame(renderGlobe);
    };

    animationFrameId = requestAnimationFrame(renderGlobe);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeHubs, isAutoRotating, landDots, layerMode, rotation.lat, rotation.lon, selectedHubId]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if user clicked directly on a 3D hub node
    const hitNode = screenNodesRef.current.find(
      (n) => Math.hypot(n.x - clickX, n.y - clickY) <= n.r + 6
    );
    if (hitNode) {
      setSelectedHubId(hitNode.id);
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
    setRotation((prev) => ({
      lon: prev.lon - dx * 0.45,
      lat: Math.max(-55, Math.min(55, prev.lat + dy * 0.35)),
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      className="rounded-3xl border shadow-sm overflow-hidden animate-fade-in-up"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
    >
      {/* Top Header & Layer Switcher */}
      <div
        className="p-5 sm:p-6 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-4"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Globe2 className="w-3.5 h-3.5" />
              Geointeligencia 3D · Huella Global UPC
            </span>
            {selectedProgram && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                Filtrado por: {selectedProgram}
              </span>
            )}
          </div>
          <h3 className="text-lg font-black text-ink">
            Planeta Interactivo 3D: Diáspora, Trabajo Remoto Global (Nearshore) y Salarios Internacionales
          </h3>
          <p className="text-xs text-ink-secondary max-w-3xl">
            Arrastra el globo terráqueo o selecciona un país para inspeccionar hacia dónde se proyecta el talento graduado de la Universidad Popular del Cesar (presencial en el exterior y contratación remota global desde Colombia).
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

      {/* Summary Strip for the Globe */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 border-b divide-y lg:divide-y-0 lg:divide-x"
        style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
      >
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-tertiary">
              Presencia Internacional
            </p>
            <p className="text-lg font-black text-ink">
              10 Hubs · {globalTotals.internationalAlumni}{' '}
              <span className="text-xs font-bold text-emerald-700">({globalTotals.intlPct}%)</span>
            </p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-tertiary">
              Talento en Remoto Global
            </p>
            <p className="text-lg font-black text-ink">
              {globalTotals.totalRemote} Egresados{' '}
              <span className="text-xs font-bold text-sky-700">({globalTotals.remotePct}%)</span>
            </p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-tertiary">
              Salario Promedio Exterior
            </p>
            <p className="text-lg font-black text-ink">
              ${(globalTotals.avgIntlSalaryCop / 1000000).toFixed(2)}M COP{' '}
              <span className="text-xs font-bold text-amber-700">~2.7x Local</span>
            </p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-tertiary">
              Principal Corredor Externo
            </p>
            <p className="text-sm font-black text-ink">🇺🇸 EE.UU. & 🇪🇸 España</p>
            <p className="text-[11px] text-ink-secondary">Tech Nearshore & Salud</p>
          </div>
        </div>
      </div>

      {/* Main Content: 3D Globe Canvas + Right Country Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left/Center: Interactive 3D Planet Viewport */}
        <div className="lg:col-span-7 relative bg-[#050E1A] min-h-[430px] sm:min-h-[480px] flex flex-col justify-between overflow-hidden">
          {/* Top Overlay Controls */}
          <div className="relative z-10 p-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/85 border border-slate-700/80 backdrop-blur-md text-xs text-slate-200 flex items-center gap-2 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Nodo Origen:</span>
              <span className="font-extrabold text-emerald-300">🇨🇴 Valledupar, Cesar (10.46°N, 73.25°W)</span>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={() => setIsAutoRotating((v) => !v)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title={isAutoRotating ? 'Pausar rotación orbital' : 'Reanudar rotación orbital'}
              >
                {isAutoRotating ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
                {isAutoRotating ? 'Órbita Activa' : 'En Pausa'}
              </button>
              <button
                onClick={() => {
                  setRotation({ lon: -58, lat: 14 });
                  setIsAutoRotating(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Centrar vista en América y Europa"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Centrar
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
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          />

          {/* Bottom Quick Hub Selector Pills */}
          <div className="relative z-10 p-4 bg-gradient-to-t from-[#040B14] via-[#040B14]/80 to-transparent">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Haz clic en un destino para rotar el planeta e inspeccionar métricas:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeHubs.map((hub) => {
                const active = hub.id === selectedHubId;
                return (
                  <button
                    key={hub.id}
                    onClick={() => focusOnHub(hub)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm scale-[1.03]'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:border-emerald-500/60 hover:text-white'
                    }`}
                  >
                    <span>{hub.flag}</span>
                    <span>{hub.country.replace(' (Sede Origen UPC)', '').replace(' (Interior)', ' Interior')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Deep Country / Hub Inspector & Ranking */}
        <div
          className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-5 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {/* Selected Hub Header Card */}
          <div className="space-y-4">
            <div
              className="p-4 rounded-2xl border space-y-3"
              style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{selectedHub.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-ink">{selectedHub.country}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        +{selectedHub.yoyGrowth}% Anual
                      </span>
                    </div>
                    <p className="text-xs text-ink-secondary flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
                  <p className="text-lg font-black text-emerald-700 mt-0.5">{selectedHub.alumniCount}</p>
                  <p className="text-[10px] text-ink-secondary">Vinculados</p>
                </div>
                <div
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <p className="text-[10px] font-bold uppercase text-ink-tertiary">En Remoto</p>
                  <p className="text-lg font-black text-sky-700 mt-0.5">{selectedHub.remoteWorkers}</p>
                  <p className="text-[10px] text-ink-secondary">
                    {Math.round((selectedHub.remoteWorkers / Math.max(1, selectedHub.alumniCount)) * 100)}% del hub
                  </p>
                </div>
                <div
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <p className="text-[10px] font-bold uppercase text-ink-tertiary">Salario Prom.</p>
                  <p className="text-base font-black text-amber-700 mt-0.5">
                    ${(selectedHub.avgSalaryCop / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-[10px] text-ink-secondary">~${selectedHub.avgSalaryUsd} USD/mes</p>
                </div>
              </div>

              {/* Programs & Employers in Selected Hub */}
              <div className="space-y-2.5 pt-1">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5 mb-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                    Carreras UPC con Mayor Demanda en este Destino
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHub.topPrograms.map((prog, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200"
                      >
                        {prog}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-700" />
                    Empresas & Entidades Receptoras ({selectedHub.primarySector})
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
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Ranking de Corredores Globales de Empleabilidad
                </h5>
                <span className="text-[11px] text-ink-tertiary font-semibold">Haz clic para enfocar</span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {activeHubs
                  .filter((h) => !h.isOrigin)
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
                        onClick={() => focusOnHub(hub)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs'
                            : 'hover:bg-muted/60'
                        }`}
                        style={
                          !isSelected
                            ? { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-lg leading-none shrink-0">{hub.flag}</span>
                          <div className="truncate">
                            <p className="text-xs font-extrabold text-ink truncate">{hub.country}</p>
                            <p className="text-[10px] text-ink-secondary truncate">{hub.primarySector}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <p className="text-xs font-black text-emerald-700">
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

          {/* Institutional Insight Footer */}
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-950 leading-relaxed">
              <strong>Valor para Acreditación CNA (Factor Egresados e Impacto Internacional):</strong> El{' '}
              <strong>{globalTotals.remotePct}%</strong> de los graduados vinculados operan en esquemas de trabajo remoto o nearshore internacional, inyectando divisas directamente en la economía del Cesar sin migración física.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

