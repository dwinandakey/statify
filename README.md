# Statify

Statify adalah aplikasi analisis statistik berbasis web yang memudahkan pengguna untuk mengunggah data dan melakukan analisis statistik. Dibangun dengan Next.js untuk frontend dan Express.js untuk backend, dengan penyimpanan data menggunakan IndexedDB di browser.

## Fitur Utama

### Manajemen Data

- **Impor Multi-format**: Mendukung file SPSS (.sav), Excel (.xlsx), CSV, dan JSON
- **Data Preview**: Pratinjau data secara real-time sebelum analisis
- **Export Hasil**: Ekspor hasil analisis ke format PDF, Excel, dan gambar

### Analisis Statistik

- **Statistik Deskriptif**: Mean, median, modus, standar deviasi, kuartil, frekuensi
- **Uji Hipotesis**: t-test, ANOVA, chi-square, korelasi
- **Regresi**: Linear dan multiple regression
- **Analisis Non-parametrik**: Mann-Whitney U, Wilcoxon signed-rank, Kruskal-Wallis

### Visualisasi Data

- **Multiple Chart Types**: Bar chart, histogram, scatter plot, box plot, pie chart
- **Real-time Updates**: Visualisasi yang berubah sesuai filter data
- **Export Visualisasi**: Simpan chart sebagai PNG, PDF, atau SVG

### User Experience

- **Progressive Web App**: Dapat di-install sebagai aplikasi desktop
- **Auto-save**: Penyimpanan otomatis ke IndexedDB browser
- **Responsive Design**: Mendukung desktop, tablet, dan mobile
- **Offline Support**: Bekerja tanpa koneksi internet setelah di-load

## Arsitektur Sistem

```
statify/
├── frontend/          # Next.js 15 dengan TypeScript
│   ├── app/          # App Router (Next.js 13+)
│   ├── components/   # Komponen React re-usable
│   ├── services/    # API services dan business logic
│   ├── stores/      # State management dengan Zustand
│   ├── repositories/ # Data access layer untuk IndexedDB
│   └── utils/       # Utility functions
├── backend/          # Express.js REST API
│   ├── server/      # Core application
│   ├── controllers/ # Request handlers
│   ├── services/    # Business logic
│   └── types/       # TypeScript definitions
├── testing/         # End-to-end testing dengan Playwright
└── docs/           # Dokumentasi pengguna
```

## Teknologi yang Digunakan

### Frontend

- **Next.js 15** - React framework dengan App Router
- **TypeScript** - Type safety dengan strict mode
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Visualisasi data interaktif
- **ECharts** - Visualisasi data kompleks
- **D3.js** - Visualisasi data advanced
- **Zustand** - State management ringan
- **Dexie** - IndexedDB wrapper untuk client-side storage
- **Lucide React** - Icon library
- **Radix UI** - Komponen UI yang dapat diakses
- **Framer Motion** - Animasi dan transisi
- **Handsontable** - Data grid untuk tabel interaktif
- **Math.js** - Perhitungan matematika kompleks
- **Papa Parse** - CSV parsing
- **SheetJS** - Excel file handling

### Backend

- **Express.js** - Node.js web framework
- **TypeScript** - Type safety
- **Zod** - Schema validation
- **Formidable** - File upload handling
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit** - Rate limiting untuk API
- **SAV Reader/Writer** - SPSS file processing

## Prasyarat Sistem

### Development Environment

- **Node.js**: v18.0.0 atau lebih baru
- **npm**: v8.0.0 atau lebih baru
- **Git**: Untuk version control
- **Docker** (opsional): Untuk containerized development

### Production Environment

- **OS**: Linux (Ubuntu 20.04+ direkomendasikan)
- **Memory**: Minimum 2GB RAM
- **Storage**: 10GB free space
- **Network**: Port 80, 443, 3000, 5000 terbuka

## Instalasi dan Setup

### Metode 1: Development Setup

1. **Clone Repository**

   ```bash
   git clone https://github.com/yourusername/statify.git
   cd statify
   ```

2. **Install Dependencies**

   ```bash
   # Install semua dependencies untuk workspaces
   npm run install:all

   # Alternatif: install manual
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. **Setup Environment Variables**

   ```bash
   # Copy environment template
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env

   # Edit file .env sesuai kebutuhan
   nano .env
   ```

4. **Setup Environment Variables**

   ```bash
   # Edit file .env sesuai kebutuhan
   # Pastikan NEXT_PUBLIC_BACKEND_URL sesuai dengan port backend
   ```

5. **Jalankan Aplikasi**

   ```bash
   # Mode development (auto-restart)
   npm run dev

   # Frontend: http://localhost:3000
   # Backend: http://localhost:5000
   # API Docs: http://localhost:5000/api-docs
   ```

### Metode 2: Docker Setup

1. **Build dan Jalankan Container**

   ```bash
   # Build semua services
   docker-compose up -d

   # Verifikasi status
   docker-compose ps
   ```

2. **Akses Aplikasi**
   - **Frontend**: http://localhost:3001
   - **Backend**: http://localhost:5000

3. **Monitoring Container**

   ```bash
   # Logs real-time
   docker-compose logs -f

   # Restart services
   docker-compose restart

   # Stop services
   docker-compose down
   ```

### Metode 3: Production Deployment

1. **Build Production**

   ```bash
   # Build frontend
   cd frontend
   npm run build

   # Build backend
   cd ../backend
   npm run build
   ```

2. **Deploy dengan Docker**

   ```bash
   # Production build
   docker-compose -f docker-compose.prod.yml up -d

   # Dengan reverse proxy (nginx)
   docker-compose -f docker-compose.nginx.yml up -d
   ```

## Cara Penggunaan

### 1. Upload Data

1. Buka http://localhost:3000
2. Klik tombol "Upload Data" di dashboard
3. Pilih file (format: .sav, .csv, .xlsx, .json)
4. Review data preview
5. Klik "Proceed to Analysis"

### 2. Analisis Statistik

1. Pilih jenis analisis dari menu sidebar
2. Pilih variabel yang ingin dianalisis
3. Konfigurasi parameter analisis
4. Klik "Run Analysis"
5. Tunggu hasil (progress bar akan muncul)

### 3. Visualisasi Data

1. Setelah analisis selesai, klik tab "Visualization"
2. Pilih tipe chart yang diinginkan
3. Drag-and-drop variabel ke sumbu X dan Y
4. Customize warna, label, dan style
5. Export chart sebagai gambar

### 4. Export Hasil

1. Klik tombol "Export" di hasil analisis
2. Pilih format (PDF, Excel, PNG)
3. Pilih komponen yang ingin diexport
4. Download file hasil

## Testing

### Unit Testing

```bash
# Frontend tests
cd frontend
npm run test

# Backend tests
cd backend
npm run test
```

### E2E Testing

```bash
# Install Playwright browsers
npx playwright install

# Jalankan E2E tests
npm run test:e2e
```

### Testing Khusus

```bash
# Frontend descriptive statistics tests
npm run test:descriptive --workspace=frontend

# Backend specific tests
npm test --workspace=backend
```

## Development Guide

### Code Style

- Gunakan ESLint untuk code linting
- Follow TypeScript strict mode
- Jest untuk testing
- Gunakan Prettier untuk code formatting

### Branch Strategy

- `main`: Production-ready code
- Gunakan branch baru untuk setiap fitur/bugfix

### Pull Request Guidelines

1. Pastikan semua tests pass
2. Update dokumentasi jika perlu
3. Request review sebelum merge

## Monitoring dan Logging

### Aplikasi Monitoring

- **Frontend**: Browser DevTools dan console logging
- **Backend**: Console logging dengan built-in logging
- **Storage**: Browser IndexedDB monitoring via DevTools Application tab
- **Performance**: Browser DevTools Performance tab untuk profiling

### Health Checks

```bash
# Check backend status
curl http://localhost:5000

# Check frontend build
npm run build
```

## Security

### Best Practices

- Rate limiting untuk API endpoints (express-rate-limit)
- Input validation dan sanitization (Zod schema validation)
- CORS configuration yang ketat
- Environment variables untuk konfigurasi
- Security headers dengan Helmet

### Security Headers

- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## Troubleshooting

### Masalah Umum

#### Frontend tidak bisa terhubung ke backend

```bash
# Check CORS configuration
# Pastikan NEXT_PUBLIC_BACKEND_URL di frontend/.env.local sesuai
# Pastikan backend berjalan di port 5000
```

#### File upload gagal

```bash
# Pastikan format file didukung (.sav, .csv, .xlsx, .json)
# Check ukuran file tidak terlalu besar
# Pastikan backend berjalan dengan benar
```

#### Build gagal

```bash
# Clear cache dan reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Build ulang
npm run build
```

#### IndexedDB issues

```bash
# Clear browser cache dan data aplikasi
# Check browser DevTools Application tab untuk IndexedDB
```

### Dukungan

- **Issues**: Buat issue di GitHub repository
- **Docs**: Lihat dokumentasi lengkap di `/docs`

## Lisensi

Proyek ini dilisensikan di bawah **MIT License** - lihat file [LICENSE](LICENSE) untuk detail.

## Contributing

Kami menyambut kontribusi dari komunitas! Untuk berkontribusi:

1. Fork repository ini
2. Buat branch untuk fitur baru (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan detail.

## Acknowledgments

- **Next.js Team** - Untuk framework React yang modern
- **Express.js Community** - Backend framework yang ringan dan powerful
- **Chart.js, ECharts, dan D3.js** - Library visualisasi data
- **TypeScript Team** - Type safety yang menjaga kode tetap maintainable
- **Zustand Team** - State management yang sederhana dan efektif
- **Semua kontributor open source** - Terima kasih atas library dan tools yang digunakan

---

**Statify** - Membuat analisis statistik menjadi mudah dan menyenangkan!

_Dibuat dengan komunitas open source_
