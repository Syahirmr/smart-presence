import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';

export const loadModels = async () => {
    const originalFetch = window.fetch;

    window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url;

        if (url.includes('/models/')) {
            const cache = await caches.open('face-api-models-cache');
            const cachedResponse = await cache.match(url);

            if (cachedResponse) {
                return cachedResponse;
            }

            const response = await originalFetch(input, init);

            if (response.status === 200) {
                await cache.put(url, response.clone());
            }
            return response;
        }

        return originalFetch(input, init);
    };

    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
    } catch (error) {
    } finally {
        window.fetch = originalFetch;
    }
};

export const detectFace = async (video: HTMLVideoElement) => {
    const options = new faceapi.TinyFaceDetectorOptions();
    const detection = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection;
};

export const detectAllFaces = async (video: HTMLVideoElement) => {
    const options = new faceapi.TinyFaceDetectorOptions();
    const detections = await faceapi
        .detectAllFaces(video, options)
        .withFaceLandmarks()
        .withFaceDescriptors();
    return detections;
};

export const getFaceDescriptor = async (image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement) => {
    const options = new faceapi.TinyFaceDetectorOptions();
    const detection = await faceapi
        .detectSingleFace(image, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection?.descriptor;
};
