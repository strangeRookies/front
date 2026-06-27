// useWebRTC.ts
import { useState, useEffect } from 'react';

export const useWebRTC = (streamUrl: string) => {
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // 실제 연동 시: 
    // 1. RTCPeerConnection 객체 생성
    // 2. 미디어 서버와 시그널링(SDP 교환) 수행
    // 3. ontrack 이벤트를 통해 stream 객체 획득 -> setStream(event.streams[0])
    
    // 테스트용 임시 코드 (웹캠 스트림 사용)
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(setStream)
      .catch(console.error);
  }, [streamUrl]);

  return stream;
};