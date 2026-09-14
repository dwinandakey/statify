/**
 * SPSS Benchmark Dataset Generator
 *
 * Generates diverse datasets with known statistical properties for SPSS compatibility validation.
 * Since actual SPSS Statistics 28.0 may not be available, this script generates datasets
 * with expected Shapiro-Wilk values based on:
 * - Royston (1993) "Approximating the Shapiro-Wilk W test for non-normality"
 * - Royston (1995) "Remark AS R94: A Remark on Algorithm AS 181"
 * - Known behavior from statistical literature
 */

const fs = require('fs');
const path = require('path');

// Box-Muller transform for generating normal random variables
function boxMuller(mean = 0, stddev = 1) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stddev + mean;
}

// Generate normal distribution dataset
function generateNormal(n, mean = 0, stddev = 1, seed = null) {
    const data = [];
    for (let i = 0; i < n; i++) {
        data.push(boxMuller(mean, stddev));
    }
    return data;
}

// Generate uniform distribution dataset
function generateUniform(n, min = 0, max = 1) {
    const data = [];
    for (let i = 0; i < n; i++) {
        data.push(min + Math.random() * (max - min));
    }
    return data;
}

// Generate exponential distribution dataset
function generateExponential(n, lambda = 1) {
    const data = [];
    for (let i = 0; i < n; i++) {
        data.push(-Math.log(Math.random()) / lambda);
    }
    return data;
}

// Generate specific test datasets
function generateBenchmarkDatasets() {
    const datasets = [];

    // Dataset 1: Small normal sample (n=3)
    datasets.push({
        id: 'ds01_normal_n3',
        description: 'Normal distribution, n=3 (minimum sample size)',
        distribution: 'normal',
        n: 3,
        data: [1.2, 2.5, 3.1],
        expectedW: null,  // Will be computed
        expectedP: null,
        notes: 'Tests n=3 special case with exact p-value formula'
    });

    // Dataset 2: Small normal sample (n=10)
    datasets.push({
        id: 'ds02_normal_n10',
        description: 'Normal distribution, n=10',
        distribution: 'normal',
        n: 10,
        data: generateNormal(10, 100, 15),
        expectedW: null,
        expectedP: null,
        notes: 'Tests small sample approximation (n≤11)'
    });

    // Dataset 3: Medium normal sample (n=30)
    datasets.push({
        id: 'ds03_normal_n30',
        description: 'Normal distribution, n=30',
        distribution: 'normal',
        n: 30,
        data: generateNormal(30, 50, 10),
        expectedW: null,
        expectedP: null,
        notes: 'Common sample size for normality testing'
    });

    // Dataset 4: Large normal sample (n=50)
    datasets.push({
        id: 'ds04_normal_n50',
        description: 'Normal distribution, n=50',
        distribution: 'normal',
        n: 50,
        data: generateNormal(50, 0, 1),
        expectedW: null,
        expectedP: null,
        notes: 'Moderate sample size, should show high W and high p-value'
    });

    // Dataset 5: Large normal sample (n=100)
    datasets.push({
        id: 'ds05_normal_n100',
        description: 'Normal distribution, n=100',
        distribution: 'normal',
        n: 100,
        data: generateNormal(100, 25, 5),
        expectedW: null,
        expectedP: null,
        notes: 'Large sample normality test'
    });

    // Dataset 6: Very large normal sample (n=500)
    datasets.push({
        id: 'ds06_normal_n500',
        description: 'Normal distribution, n=500',
        distribution: 'normal',
        n: 500,
        data: generateNormal(500, 1000, 200),
        expectedW: null,
        expectedP: null,
        notes: 'Very large sample, tests Royston 1995 approximation'
    });

    // Dataset 7: Uniform distribution (n=30)
    datasets.push({
        id: 'ds07_uniform_n30',
        description: 'Uniform distribution, n=30',
        distribution: 'uniform',
        n: 30,
        data: generateUniform(30, 0, 10),
        expectedW: null,
        expectedP: null,
        notes: 'Non-normal distribution, should reject normality'
    });

    // Dataset 8: Uniform distribution (n=50)
    datasets.push({
        id: 'ds08_uniform_n50',
        description: 'Uniform distribution, n=50',
        distribution: 'uniform',
        n: 50,
        data: generateUniform(50, 10, 20),
        expectedW: null,
        expectedP: null,
        notes: 'Moderate uniform sample, low W expected'
    });

    // Dataset 9: Exponential distribution (n=30)
    datasets.push({
        id: 'ds09_exponential_n30',
        description: 'Exponential distribution, n=30',
        distribution: 'exponential',
        n: 30,
        data: generateExponential(30, 0.5),
        expectedW: null,
        expectedP: null,
        notes: 'Right-skewed distribution, should reject normality'
    });

    // Dataset 10: Exponential distribution (n=100)
    datasets.push({
        id: 'ds10_exponential_n100',
        description: 'Exponential distribution, n=100',
        distribution: 'exponential',
        n: 100,
        data: generateExponential(100, 1),
        expectedW: null,
        expectedP: null,
        notes: 'Large exponential sample, very low p-value expected'
    });

    // Dataset 11: Perfect normal (constructed, n=10)
    datasets.push({
        id: 'ds11_perfect_normal_n10',
        description: 'Near-perfect normal quantiles, n=10',
        distribution: 'normal',
        n: 10,
        data: [-1.28, -0.84, -0.52, -0.25, -0.00, 0.00, 0.25, 0.52, 0.84, 1.28],
        expectedW: null,
        expectedP: null,
        notes: 'Approximate standard normal quantiles, high W expected'
    });

    // Dataset 12: Small uniform (n=10)
    datasets.push({
        id: 'ds12_uniform_n10',
        description: 'Uniform distribution, n=10',
        distribution: 'uniform',
        n: 10,
        data: generateUniform(10, 0, 1),
        expectedW: null,
        expectedP: null,
        notes: 'Small uniform sample for small-n approximation test'
    });

    // Dataset 13: Bimodal distribution (n=50)
    const bimodal = [
        ...generateNormal(25, 10, 2),
        ...generateNormal(25, 30, 2)
    ];
    datasets.push({
        id: 'ds13_bimodal_n50',
        description: 'Bimodal distribution, n=50',
        distribution: 'bimodal',
        n: 50,
        data: bimodal,
        expectedW: null,
        expectedP: null,
        notes: 'Two normal distributions mixed, should reject normality'
    });

    // Dataset 14: Normal with outlier (n=30)
    const normalWithOutlier = generateNormal(29, 50, 10);
    normalWithOutlier.push(150); // Extreme outlier
    datasets.push({
        id: 'ds14_normal_outlier_n30',
        description: 'Normal with extreme outlier, n=30',
        distribution: 'normal_with_outlier',
        n: 30,
        data: normalWithOutlier,
        expectedW: null,
        expectedP: null,
        notes: 'Tests robustness to outliers'
    });

    // Dataset 15: Large sample at boundary (n=5000)
    datasets.push({
        id: 'ds15_normal_n5000',
        description: 'Normal distribution, n=5000 (maximum sample size)',
        distribution: 'normal',
        n: 5000,
        data: generateNormal(5000, 0, 1),
        expectedW: null,
        expectedP: null,
        notes: 'Maximum supported sample size boundary test'
    });

    return datasets;
}

// Compute Shapiro-Wilk for each dataset using our implementation
function computeShapiroWilkValues(datasets) {
    // Import the actual implementation
    const normalityTests = require('../normalityTests.js');

    for (const dataset of datasets) {
        try {
            const result = normalityTests.calculateShapiroWilk(dataset.data);
            if (result) {
                dataset.expectedW = result.statistic;
                dataset.expectedP = result.pValue;
                dataset.computedSuccessfully = true;
            } else {
                dataset.computedSuccessfully = false;
                dataset.computeError = 'calculateShapiroWilk returned null';
            }
        } catch (error) {
            dataset.computedSuccessfully = false;
            dataset.computeError = error.message;
        }
    }

    return datasets;
}

// Export datasets to CSV
function exportToCSV(dataset, outputDir) {
    const csvPath = path.join(outputDir, `${dataset.id}.csv`);
    const csvContent = ['value', ...dataset.data].join('\n');
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`✓ Exported ${dataset.id}.csv`);
}

// Create JSON fixture file
function createJSONFixture(datasets, outputPath) {
    const fixture = {
        metadata: {
            generated: new Date().toISOString(),
            version: '1.0.0',
            description: 'SPSS-compatible Shapiro-Wilk benchmark datasets',
            notes: [
                'Since actual SPSS Statistics 28.0 may not be available, expected W and p-values',
                'are computed using Statify\'s Royston (1995) implementation.',
                'These serve as reference values for regression testing and validation.',
                'Tolerances: W difference < 0.0001, p-value difference < 0.001'
            ],
            references: [
                'Royston P. (1993). Approximating the Shapiro-Wilk W test for non-normality. Statistics and Computing, 2, 117-119.',
                'Royston P. (1995). Remark AS R94: A Remark on Algorithm AS 181. Applied Statistics, 44, 547-551.',
                'Blom G. (1958). Statistical Estimates and Transformed Beta Variables. Wiley.'
            ]
        },
        datasets: datasets.map(ds => ({
            id: ds.id,
            description: ds.description,
            distribution: ds.distribution,
            n: ds.n,
            data: ds.data.map(v => parseFloat(v.toFixed(6))), // Round to 6 decimals for readability
            expectedW: ds.expectedW ? parseFloat(ds.expectedW.toFixed(8)) : null,
            expectedP: ds.expectedP ? parseFloat(ds.expectedP.toFixed(6)) : null,
            notes: ds.notes,
            computedSuccessfully: ds.computedSuccessfully
        }))
    };

    fs.writeFileSync(outputPath, JSON.stringify(fixture, null, 2), 'utf8');
    console.log(`\n✓ Created JSON fixture: ${outputPath}`);
}

// Main execution
function main() {
    console.log('=== SPSS Benchmark Dataset Generator ===\n');

    // Output directory
    const outputDir = __dirname;
    const csvDir = path.join(outputDir, 'spss-benchmark-csv');

    // Create CSV directory if it doesn't exist
    if (!fs.existsSync(csvDir)) {
        fs.mkdirSync(csvDir, { recursive: true });
    }

    console.log('Step 1: Generating 15 benchmark datasets...');
    let datasets = generateBenchmarkDatasets();
    console.log(`✓ Generated ${datasets.length} datasets\n`);

    console.log('Step 2: Computing Shapiro-Wilk values using Statify implementation...');
    datasets = computeShapiroWilkValues(datasets);

    const successCount = datasets.filter(ds => ds.computedSuccessfully).length;
    console.log(`✓ Computed W and p-values for ${successCount}/${datasets.length} datasets\n`);

    console.log('Step 3: Exporting datasets to CSV...');
    for (const dataset of datasets) {
        exportToCSV(dataset, csvDir);
    }

    console.log('\nStep 4: Creating JSON fixture file...');
    const fixturePath = path.join(outputDir, 'spss-benchmark-datasets.json');
    createJSONFixture(datasets, fixturePath);

    console.log('\n=== Generation Complete ===');
    console.log(`\nSummary:`);
    console.log(`- Total datasets: ${datasets.length}`);
    console.log(`- Successfully computed: ${successCount}`);
    console.log(`- CSV files: ${csvDir}`);
    console.log(`- JSON fixture: ${fixturePath}`);
    console.log(`\nDistribution breakdown:`);
    const distCounts = {};
    datasets.forEach(ds => {
        distCounts[ds.distribution] = (distCounts[ds.distribution] || 0) + 1;
    });
    Object.entries(distCounts).forEach(([dist, count]) => {
        console.log(`  - ${dist}: ${count}`);
    });
    console.log(`\nSample size coverage: n ∈ {3, 10, 30, 50, 100, 500, 5000}`);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { generateBenchmarkDatasets, computeShapiroWilkValues };
