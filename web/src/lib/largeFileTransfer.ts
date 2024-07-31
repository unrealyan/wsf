interface ProgressEvent {
    type: 'progress';
    data: number;
}

class LargeFileTransfer {
    private file: File;
    private dataChannel: RTCDataChannel;
    private chunkSize: number;
    private offset: number;
    private sentSize: number;
    private reader: FileReader;
    private sending: boolean;

    constructor(file: File, dataChannel: RTCDataChannel, chunkSize: number = 64 * 1024) {
        this.file = file;
        this.dataChannel = dataChannel;
        this.chunkSize = chunkSize;
        this.offset = 0;
        this.sentSize = 0;
        this.reader = new FileReader();
        this.sending = false;
    }

    public start(): void {
        this.dataChannel.bufferedAmountLowThreshold = 1024 * 1024; // 1MB
        this.sendNextChunk();
    }

    private sendNextChunk(): void {
        if (this.offset >= this.file.size) {
            this.dataChannel.send('done');
            return;
        }

        const slice = this.file.slice(this.offset, this.offset + this.chunkSize);
        this.reader.onload = (e: ProgressEvent<FileReader>) => this.onChunkRead(e.target?.result as ArrayBuffer);
        this.reader.readAsArrayBuffer(slice);
    }

    private onChunkRead(chunk: ArrayBuffer): void {
        this.sending = true;
        this.sendChunk(chunk);
    }

    private sendChunk(chunk: ArrayBuffer): void {
        if (!this.sending) return;

        if (this.dataChannel.bufferedAmount > this.dataChannel.bufferedAmountLowThreshold) {
            this.sending = false;
            this.dataChannel.onbufferedamountlow = () => {
                this.dataChannel.onbufferedamountlow = null;
                this.sending = true;
                this.sendChunk(chunk);
            };
            return;
        }

        this.dataChannel.send(chunk);
        this.offset += chunk.byteLength;
        this.sentSize += chunk.byteLength;

        const progress = Math.ceil(this.sentSize / (this.file.size / 100));
        // console.log(`File transfer progress: ${progress}%`);
        
        // 触发进度更新事件
        this.dispatchProgressEvent(progress);

        if (this.offset < this.file.size) {
            this.sendNextChunk();
        }
    }

    private dispatchProgressEvent(progress: number): void {
        // const event: ProgressEvent = {
        //     type: 'progress',
        //     data: progress
        // };
        // 假设这里有一个事件分发机制
        // this.eventEmitter.emit('progress', event);
    }
}