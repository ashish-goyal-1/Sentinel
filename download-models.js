import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const OUTPUT_DIR = path.join(__dirname, 'public', 'models');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const models = [
    // TinyFaceDetector
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',

    // FaceLandmark68
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',

    // FaceRecognition (has 2 shards!)
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);

        console.log(`📥 Downloading: ${path.basename(dest)}...`);

        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    const stats = fs.statSync(dest);
                    console.log(`✅ Downloaded: ${path.basename(dest)} (${stats.size} bytes)`);
                    resolve();
                });
            } else {
                fs.unlink(dest, () => { });
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function downloadAllModels() {
    console.log('🚀 Starting model download...\n');

    for (const modelFile of models) {
        const url = `${MODEL_BASE_URL}/${modelFile}`;
        const dest = path.join(OUTPUT_DIR, modelFile);

        try {
            await downloadFile(url, dest);
        } catch (error) {
            console.error(`❌ Error downloading ${modelFile}:`, error.message);
            process.exit(1);
        }
    }

    console.log('\n✅ All models downloaded successfully!');
    console.log(`📁 Location: ${OUTPUT_DIR}`);
}

downloadAllModels();
