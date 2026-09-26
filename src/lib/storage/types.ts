export type StoredObject = {
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
};

export interface ObjectStorage {
  putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StoredObject>;
  getPublicUrl(key: string): string;
}
