# WebRTC Peer-to-Peer File Transfer

## Project Introduction

This project utilizes WebRTC technology to achieve peer-to-peer file transfer with the following features:

- Secure and reliable: File transfer occurs directly between peers without passing through a server
- Efficient and fast: Leverages WebRTC data channels for high-speed file transfer
- Privacy-focused: Peer-to-peer transfer ensures file content is not accessible to third parties

### Browser Compatibility

Due to browser limitations, this project currently primarily supports Chrome. Other browsers may have the following issues:

- WebRTC functionality is disabled by default
- Lack of support for the `showSaveFilePicker` method

We continue to monitor browser compatibility updates and plan to expand support in future versions.

## Online Demo

You can try out the live demo of this project at:

[https://wsf.ptcl.one](https://wsf.ptcl.one)

## Project Deployment

Deployment is relatively simple. Follow these steps:

### Frontend Compilation

To build the frontend, run: npm run build

### Backend Compilation

To compile the backend for Linux ARM64, use: GOOS=linux GOARCH=arm64 go build -o websf

## Getting Started

```
npm run dev

go run main
```


