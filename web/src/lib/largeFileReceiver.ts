export default class LargeFileReceiver {
    private fileHandle: FileSystemFileHandle | null;
    private writer: FileSystemWritableFileStream | null;
    private receivedSize: number;
    private suggestedName: string;

    constructor(suggestedName: string) {
        this.fileHandle = null;
        this.writer = null;
        this.receivedSize = 0;
        this.suggestedName = suggestedName;
    }

    public async start(): Promise<void> {
        try {
            // 请求用户选择保存文件的位置
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: this.suggestedName
            });
            // 创建可写流
            this.writer = await this.fileHandle.createWritable();
        } catch (err) {
            console.error('Error starting file receiver:', err);
            throw err;
        }
    }

    public async receiveChunk(chunk: ArrayBuffer): Promise<void> {
        if (!this.writer) {
            throw new Error('File receiver not started');
        }

        try {
            // 直接将数据块写入文件
            await this.writer.write(chunk);
            this.receivedSize += chunk.byteLength;
            console.log(`Received: ${this.receivedSize} bytes`);
            // 这里可以触发进度更新事件
        } catch (err) {
            console.error('Error writing chunk:', err);
            throw err;
        }
    }

    public async finish(): Promise<void> {
        if (this.writer) {
            try {
                await this.writer.close();
                console.log('File received and saved, size:', this.receivedSize);
                // 这里可以触发文件接收完成事件
            } catch (err) {
                console.error('Error closing file:', err);
                throw err;
            } finally {
                this.writer = null;
            }
        }
    }
}

// 使用示例
async function handleFileTransfer(dataChannel: RTCDataChannel, fileName: string): Promise<void> {
    const receiver = new LargeFileReceiver(fileName);
    
    try {
        await receiver.start();

        dataChannel.addEventListener('message', async (event: MessageEvent) => {
            if (event.data === 'done') {
                await receiver.finish();
                console.log('File transfer completed');
            } else {
                await receiver.receiveChunk(event.data);
            }
        });
    } catch (err) {
        console.error('File transfer failed:', err);
    }
}