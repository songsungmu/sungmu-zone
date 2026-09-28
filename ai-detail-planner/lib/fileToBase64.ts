export interface FileBase64Result {
  base64Data: string;
  mimeType: string;
  fileName: string;
}

/** File을 FileReader로 읽어 base64 문자열(데이터 URL 접두사 제외)로 변환한다. */
export function fileToBase64(file: File): Promise<FileBase64Result> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(`${file.name} 파일을 읽지 못했습니다.`));
        return;
      }
      const base64Data = result.slice(result.indexOf(",") + 1);
      if (!base64Data) {
        reject(new Error(`${file.name} 파일이 손상되었거나 비어 있습니다.`));
        return;
      }
      resolve({ base64Data, mimeType: file.type, fileName: file.name });
    };

    reader.onerror = () => {
      reject(new Error(`${file.name} 파일을 읽는 중 오류가 발생했습니다.`));
    };

    reader.readAsDataURL(file);
  });
}
