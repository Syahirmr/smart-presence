import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';

export const loadModels = async () => {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        console.log('Models loaded successfully');
    } catch (error) {
        console.error('Error loading models:', error);
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

export const getFaceDescriptor = async (image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement) => {
    const options = new faceapi.TinyFaceDetectorOptions();
    const detection = await faceapi
        .detectSingleFace(image, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection?.descriptor;
};
