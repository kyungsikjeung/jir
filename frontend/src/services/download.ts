import apiClient from './api.client';

/**
 * 인증이 필요한 파일 다운로드.
 * window.open은 Authorization 헤더를 붙이지 못하므로
 * axios로 blob을 받아 임시 URL로 저장한다.
 */
export async function downloadFile(url: string, filename: string) {
  const res = await apiClient.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
