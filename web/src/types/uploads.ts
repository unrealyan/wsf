export interface UploadRecord {
    id?: number;
    sender_id: string;
    sender_ip: string;
    filename: string;
    filesize: number;
    send_time: string;
    receiver_id: string;
    receiver_ip: string;
    receive_time: string;
  }
  
  export interface PaginatedUploadRecords {
    records: UploadRecord[];
    total_count: number;
    total_pages: number;
    page: number;
    page_size: number;
  }