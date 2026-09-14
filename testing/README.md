<<<<<<< HEAD
# Load Testing with k6

This directory contains load tests for the Statify SPSS application using k6.

## Test Scripts

### Frontend Tests
1. **basic-load-test.js** - Basic load test that simulates users accessing different pages of the application
2. **spss-operations-test.js** - Test that covers frontend pages related to data and variable management
3. **frontend-routes-test.js** - Targeted test that specifically covers all frontend routes in the application (landing, dashboard, data, variable, result, help pages)

### Backend Tests
4. **sav-apis-test.js** - Test specifically for the two SAV APIs (read and write operations)

## Running Tests

### Using npm scripts (recommended)

```bash
# Run basic load test
npm run test:load:basic

# Run SPSS operations load test
npm run test:load:operations

# Run frontend routes test
npm run test:load:routes

# Run SAV APIs test
npm run test:load:sav

# Run a quick smoke test
npm run test:load:smoke
```

### Direct k6 commands

```bash
# Run basic test with default settings
npx k6 run basic-load-test.js

# Run with custom settings
npx k6 run --vus 20 --duration 60s basic-load-test.js

# Run with output to file
npx k6 run --out json=results.json basic-load-test.js
```

## Test Configuration

- **VUs (Virtual Users)**: Number of concurrent users simulated
- **Duration**: How long the test runs
- **Thresholds**: Performance criteria that must be met

## Interpreting Results

Key metrics to watch:

- **http_req_duration**: Response time for HTTP requests
- **http_req_failed**: Rate of failed requests
- **iterations**: Number of test iterations completed
- **data_received/sent**: Network traffic

## Customizing Tests

You can modify the test scripts to:

1. Change the target URLs
2. Adjust the load patterns
3. Add new SPSS operations
4. Modify thresholds
5. Add new metrics

For more information about k6 scripting, visit [https://k6.io/docs/](https://k6.io/docs/)
=======
# Statify Testing Framework

Performance testing untuk Statify menggunakan k6.

## Setup

k6 sudah terinstall secara global. Untuk menjalankan test:

### Basic Tests
```bash
npm test                # Basic test
npm run test:smoke      # Smoke test (1 VU, 30s)
npm run test:load       # Load test (10 VU, 60s)
npm run test:stress     # Stress test (50 VU, 120s)
npm run test:report     # Test dengan JSON report
```

### Browser UI Tests
```bash
npm run test:browser:frequencies        # Test frequencies analysis workflow (slow, ~5-10 min)
npm run test:browser:frequencies:patient # Same test with quiet output for slow operations  
npm run test:browser:smoke             # Browser smoke test (fast, ~10-30 sec)
npm run test:browser:simple            # Alias for smoke test
```

**Note**: Test frequencies analysis membutuhkan waktu lama karena proses import dataset di Statify memang lambat. Test ini akan menunggu hingga 15 detik untuk dataset loading dan total timeout 10 menit.
### Statify Specific Tests
```bash
npm run test:dashboard       # Test dashboard page (5 VU, 60s)
npm run test:multi-page      # Test multiple pages (3 VU, 45s)
npm run test:all-statify     # Run all Statify tests
```

## Target Website

Tests dikonfigurasi untuk website:
- **Main Target**: https://statify-dev.student.stis.ac.id/dashboard/data
- **Base URL**: https://statify-dev.student.stis.ac.id

## Struktur Direktori

```
tests/
  performance/              # k6 performance tests
    basic-test.js          # Basic test template
    statify-dashboard-test.js    # Specific dashboard test
    statify-multi-page-test.js   # Multi-page test
  browser/                  # k6 browser UI tests
    statify-frequencies-analysis.js  # Frequencies analysis workflow test
reports/                   # Test reports dan hasil
```

## Membuat Test Baru

1. Buat file `.js` baru di `tests/performance/`
2. Gunakan template dasar k6
3. Update script di `package.json` jika diperlukan

## Contoh Test Dasar

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  let response = http.get('https://your-api.com/endpoint');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```
>>>>>>> 5fc4eb2c1a6bb3a519ea978df15d69574d811c52
