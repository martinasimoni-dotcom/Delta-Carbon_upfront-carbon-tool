export interface Manufacturer {
  id: string;
  name: string;
  material: string;
  materialId: string;
  location: string;
  coords: { lat: number; lng: number };
  website: string;
  co2PerKm: number;
  regions: string[];
}

export const MANUFACTURERS: Manufacturer[] = [
  // CLT / Timber strutturale
  { id: "egoin", name: "Egoin", material: "CLT / Cross-laminated timber", materialId: "clt-glulam", location: "Zamudio, Spain", coords: { lat: 43.2969, lng: -2.8716 }, website: "https://egoin.com", co2PerKm: 0.062, regions: ["ES", "EU"] },
  { id: "arboreal", name: "Arboreal", material: "CLT / Cross-laminated timber", materialId: "clt-glulam", location: "Galicia, Spain", coords: { lat: 42.8782, lng: -8.5448 }, website: "https://arboreal.es", co2PerKm: 0.062, regions: ["ES"] },
  { id: "hasslacher", name: "Hasslacher", material: "CLT / Cross-laminated timber", materialId: "clt-glulam", location: "Sachsenburg, Austria", coords: { lat: 46.8333, lng: 13.3167 }, website: "https://hasslacher.co.at", co2PerKm: 0.062, regions: ["EU"] },
  { id: "klh", name: "KLH Massivholz", material: "CLT / Cross-laminated timber", materialId: "clt-glulam", location: "Teufenbach, Austria", coords: { lat: 47.1167, lng: 14.3667 }, website: "https://klh.at", co2PerKm: 0.062, regions: ["EU"] },
  // Acciaio strutturale
  { id: "celsa", name: "Celsa Group", material: "Structural steel", materialId: "steel-struct", location: "Barcelona, Spain", coords: { lat: 41.3851, lng: 2.1734 }, website: "https://celsagroup.com", co2PerKm: 0.062, regions: ["ES", "EU"] },
  { id: "acerinox", name: "Acerinox", material: "Structural steel", materialId: "steel-struct", location: "Madrid, Spain", coords: { lat: 40.4168, lng: -3.7038 }, website: "https://acerinox.com", co2PerKm: 0.062, regions: ["ES"] },
  // Calcestruzzo
  { id: "acciona", name: "Acciona", material: "Concrete C30/37", materialId: "concrete-c30", location: "Madrid, Spain", coords: { lat: 40.4168, lng: -3.7038 }, website: "https://acciona.com", co2PerKm: 0.062, regions: ["ES"] },
  { id: "lafarge", name: "LafargeHolcim Spain", material: "Concrete C30/37", materialId: "concrete-c30", location: "Barcelona, Spain", coords: { lat: 41.3851, lng: 2.1734 }, website: "https://lafargeholcim.es", co2PerKm: 0.062, regions: ["ES"] },
  // Mattoni
  { id: "terreal", name: "Terreal Ibérica", material: "Brick, red", materialId: "brick-red", location: "Valencia, Spain", coords: { lat: 39.4699, lng: -0.3763 }, website: "https://terreal.es", co2PerKm: 0.062, regions: ["ES"] },
  { id: "cobert", name: "Cobert", material: "Brick, red", materialId: "brick-red", location: "Tarragona, Spain", coords: { lat: 41.1189, lng: 1.2445 }, website: "https://cobert.es", co2PerKm: 0.062, regions: ["ES"] },
  // Paglia / bio-based
  { id: "isobloc", name: "Isobloc", material: "Straw panels", materialId: "straw", location: "Lleida, Spain", coords: { lat: 41.6176, lng: 0.6200 }, website: "https://isobloc.es", co2PerKm: 0.062, regions: ["ES"] },
];
