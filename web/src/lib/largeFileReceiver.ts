export default class LargeFileReceiver {
    private fileHandle: FileSystemFileHandle | null;
    private writer: FileSystemWritableFileStream | null;
    private receivedSize: number;
    private suggestedName: string;
    fileDataArray: ArrayBuffer[];
    fileInfo: { name: string; size: number; };


    constructor(suggestedName: string) {
        this.fileHandle = null;
        this.writer = null;
        this.receivedSize = 0;
        this.suggestedName = suggestedName;
        this.fileDataArray = [];
        this.fileInfo = {
            name: "",
            size: 0
        }
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
            // console.error('Error starting file receiver:', err);
            // throw err;
        }
    }

    public async receiveChunk(chunk: ArrayBuffer): Promise<void> {
        if (!this.writer) {
            return new Promise(resolve => {
                // throw new Error('File receiver not started');
                this.fileDataArray.push(chunk);
                this.receivedSize += chunk.byteLength;
                // console.log(`Received: ${this.receivedSize} bytes`);
                resolve();
            })
        }else {
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
        } else {
            const blob = new Blob(this.fileDataArray);
            downloadFile(blob, this.fileInfo.name);
        }
    }
}

const downloadFile = (blob: Blob, fileName: string) => {
    const a = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
};