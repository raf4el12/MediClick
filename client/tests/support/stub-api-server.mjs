// Servidor HTTP mínimo para las páginas públicas renderizadas en el servidor: `page.route` del arnés
// solo intercepta lo que pide el navegador, no los `fetch` que hace Next en el servidor.
import { createServer } from 'node:http';

const PORT = Number(process.env.STUB_API_PORT ?? 5199);

const miraflores = { id: 1, name: 'Sede Miraflores', address: 'Av. Larco 1150, Miraflores' };
const sanIsidro = { id: 2, name: 'Sede San Isidro', address: 'Av. Javier Prado 450, San Isidro' };

export const doctors = [
  {
    id: 1,
    name: 'Lucía',
    lastName: 'Paredes',
    photo: null,
    specialties: [
      { id: 2, name: 'Cardiología' },
      { id: 1, name: 'Medicina General' },
    ],
    clinic: miraflores,
    ratingAvg: 4.5,
    ratingCount: 2,
    resume: 'Cardióloga con doce años de experiencia en prevención y control de la hipertensión.',
    licenseNumber: 'CMP-45678',
  },
  {
    id: 2,
    name: 'Mario',
    lastName: 'Vega',
    photo: null,
    specialties: [{ id: 1, name: 'Medicina General' }],
    clinic: sanIsidro,
    ratingAvg: null,
    ratingCount: 0,
    resume: null,
    licenseNumber: 'CMP-11223',
  },
  {
    id: 3,
    name: 'Camila',
    lastName: 'Rojas',
    photo: null,
    specialties: [{ id: 3, name: 'Dermatología' }],
    clinic: miraflores,
    ratingAvg: 4,
    ratingCount: 1,
    resume: 'Dermatóloga clínica.',
    licenseNumber: 'CMP-33445',
  },
];

const reviews = {
  1: [
    { id: 10, rating: 5, comment: 'Muy clara al explicar el tratamiento.', createdAt: '2026-10-02T15:00:00.000Z' },
    { id: 11, rating: 4, comment: 'Puntual y amable.', createdAt: '2026-09-20T15:00:00.000Z' },
  ],
  2: [],
  3: [{ id: 12, rating: 4, comment: 'Me resolvió la duda en una sola consulta.', createdAt: '2026-09-28T15:00:00.000Z' }],
};

const summary = ({ resume: _r, licenseNumber: _l, ...rest }) => rest;
const page = (items, query, size = 12) => {
  const currentPage = Number(query.get('currentPage') ?? 1);
  const pageSize = Number(query.get('pageSize') ?? size);
  return { rows: items.slice((currentPage - 1) * pageSize, currentPage * pageSize), totalRows: items.length, currentPage, totalPages: Math.ceil(items.length / pageSize) };
};

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const q = url.searchParams;
  if (url.pathname === '/health') return json(res, 200, { ok: true });
  if (url.pathname === '/public/doctors') {
    const term = (q.get('searchValue') ?? '').toLowerCase();
    const rows = doctors
      .filter((d) => !q.get('clinicId') || d.clinic.id === Number(q.get('clinicId')))
      .filter((d) => !q.get('specialtyId') || d.specialties.some((s) => s.id === Number(q.get('specialtyId'))))
      .filter((d) => !term || `${d.name} ${d.lastName}`.toLowerCase().includes(term))
      .map(summary);
    return json(res, 200, page(rows, q));
  }
  const detail = url.pathname.match(/^\/public\/doctors\/(\d+)(\/reviews)?$/);
  if (detail) {
    const doctor = doctors.find((d) => d.id === Number(detail[1]));
    if (!doctor) return json(res, 404, { message: 'Médico no encontrado' });
    if (detail[2]) return json(res, 200, { ...page(reviews[doctor.id], q, 5), ratingAvg: doctor.ratingAvg, ratingCount: doctor.ratingCount });
    return json(res, 200, doctor);
  }
  json(res, 404, { message: 'No encontrado' });
}).listen(PORT, () => console.log(`stub API en http://localhost:${PORT}`));
